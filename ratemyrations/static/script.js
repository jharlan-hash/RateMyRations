document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById("menu-date");
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    let ratings = {};
    let userRatings = JSON.parse(localStorage.getItem("userRatings")) || {};
    let browserId = localStorage.getItem("browserId");
    if (!browserId) {
        browserId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("browserId", browserId);
    }

    const diningHallHours = {
        "Burge": {
            "Breakfast": { start: 7.5, end: 10.5 },
            "Lunch": { start: 10.5, end: 14.5 },
            "Dinner": { start: 16.5, end: 20 }
        },
        "Catlett": {
            "Breakfast": { start: 7.5, end: 14.5 },
            "Lunch": { start: 7.5, end: 14.5 },
            "Dinner": { start: 16, end: 20 }
        },
        "Hillcrest": {
            "Breakfast": { start: 7.5, end: 14 },
            "Lunch": { start: 7.5, end: 14 },
            "Dinner": { start: 15.5, end: 20 }
        }
    };

    function getCurrentMeal(diningHall) {
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        const hours = diningHallHours[diningHall];
        if (hours) {
            for (const meal in hours) {
                if (currentHour >= hours[meal].start && currentHour < hours[meal].end) {
                    return meal;
                }
            }
        }
        return null;
    }

    function fetchRatings() {
        return fetch(`/api/ratings?date=${dateInput.value}`)
            .then(response => response.json())
            .then(data => {
                ratings = data;
            });
    }

    function renderStars(rating, foodId, isInteractive = true) {
        const starRatingContainer = document.createElement("div");
        starRatingContainer.classList.add("star-rating-container");

        if (isInteractive) {
            const starRating = document.getElementById("star-rating-template").content.cloneNode(true);
            const stars = starRating.querySelectorAll(".star");

            stars.forEach(star => {
                if (star.dataset.value <= rating) {
                    star.classList.add("rated");
                }
                if (userRatings[foodId] && star.dataset.value <= userRatings[foodId]) {
                    star.classList.add("user-rated");
                }

                star.addEventListener("click", (event) => {
                    event.stopPropagation();
                    let newRating = star.dataset.value;
                    if (star.classList.contains("user-rated") && newRating == userRatings[foodId]) {
                        newRating = 0;
                    }

                    const openTabs = new Set();
                    document.querySelectorAll(".active").forEach(tab => {
                        openTabs.add(tab.id);
                    });

                    if (star.dataset._debouncing) return;
                    star.dataset._debouncing = "1";
                    fetch("/api/rate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ food_id: foodId, rating: newRating, user_id: browserId, date: dateInput.value })
                    }).then(() => {
                        if (newRating === 0) {
                            delete userRatings[foodId];
                        } else {
                            userRatings[foodId] = newRating;
                        }
                        localStorage.setItem("userRatings", JSON.stringify(userRatings));
                        
                        // Simple approach: re-render everything
                        fetchRatings().then(() => fetchMenus(dateInput.value, openTabs));
                    }).finally(() => {
                        delete star.dataset._debouncing;
                    });
                });
            });

            starRatingContainer.appendChild(starRating);
        } else {
            const starsOuter = document.createElement("div");
            starsOuter.classList.add("stars-outer");

            const starsInner = document.createElement("div");
            starsInner.classList.add("stars-inner");
            const safeRating = isFinite(rating) && !isNaN(rating) ? rating : 0;
            const starPercentage = (safeRating / 5) * 100;
            starsInner.style.width = `${starPercentage}%`;

            starsOuter.appendChild(starsInner);
            starRatingContainer.appendChild(starsOuter);

            const ratingValue = document.createElement("span");
            ratingValue.classList.add("rating-value");
            ratingValue.textContent = `(${safeRating.toFixed(2)})`;
            starRatingContainer.appendChild(ratingValue);
        }


        return starRatingContainer;
    }

    function filterRatingsByMenu(ratings, menuData) {
        // Create a set of food keys that are in today's menu
        const menuFoodKeys = new Set();
        for (const diningHall in menuData) {
            for (const meal in menuData[diningHall]) {
                for (const station in menuData[diningHall][meal]) {
                    const items = menuData[diningHall][meal][station];
                    if (items && items.length > 0) {
                        for (const item of items) {
                            // Use the original meal slug from the menu data, not normalized display name
                            const foodKey = `${item.name}_${station}_${diningHall}_${meal}`;
                            menuFoodKeys.add(foodKey);
                        }
                    }
                }
            }
        }
        
        // Filter ratings to only include foods that are in the menu
        const filteredRatings = {
            foods: {},
            stations: {},
            dining_halls: {},
            meals: {}
        };
        
        // Filter food ratings
        for (const [foodKey, rating] of Object.entries(ratings.foods)) {
            if (menuFoodKeys.has(foodKey)) {
                filteredRatings.foods[foodKey] = rating;
            }
        }
        
        // Recalculate station ratings based on filtered foods
        const stationRatings = {};
        for (const [foodKey, rating] of Object.entries(filteredRatings.foods)) {
            const parts = foodKey.split('_');
            const foodName = parts[0];
            const station = parts[1];
            const diningHall = parts[2];
            const meal = parts[3];
            const stationKey = `${station}_${diningHall}`;
            
            if (!stationRatings[stationKey]) {
                stationRatings[stationKey] = { total: 0, count: 0 };
            }
            stationRatings[stationKey].total += rating.avg_rating * rating.rating_count;
            stationRatings[stationKey].count += rating.rating_count;
        }
        
        for (const [stationKey, data] of Object.entries(stationRatings)) {
            if (data.count > 0) {
                filteredRatings.stations[stationKey] = {
                    avg_rating: data.total / data.count,
                    rating_count: data.count
                };
            }
        }
        
        // Recalculate dining hall ratings based on filtered foods
        const diningHallRatings = {};
        for (const [foodKey, rating] of Object.entries(filteredRatings.foods)) {
            const parts = foodKey.split('_');
            const diningHall = parts[2];
            
            if (!diningHallRatings[diningHall]) {
                diningHallRatings[diningHall] = { total: 0, count: 0 };
            }
            diningHallRatings[diningHall].total += rating.avg_rating * rating.rating_count;
            diningHallRatings[diningHall].count += rating.rating_count;
        }
        
        for (const [diningHall, data] of Object.entries(diningHallRatings)) {
            if (data.count > 0) {
                filteredRatings.dining_halls[diningHall] = {
                    avg_rating: data.total / data.count,
                    rating_count: data.count
                };
            }
        }
        
        // Recalculate meal ratings based on filtered foods
        const mealRatings = {};
        for (const [foodKey, rating] of Object.entries(filteredRatings.foods)) {
            const parts = foodKey.split('_');
            const diningHall = parts[2];
            const meal = parts[3];
            const mealKey = `${diningHall}_${meal}`;
            
            if (!mealRatings[mealKey]) {
                mealRatings[mealKey] = { total: 0, count: 0 };
            }
            mealRatings[mealKey].total += rating.avg_rating * rating.rating_count;
            mealRatings[mealKey].count += rating.rating_count;
        }
        
        for (const [mealKey, data] of Object.entries(mealRatings)) {
            if (data.count > 0) {
                filteredRatings.meals[mealKey] = {
                    avg_rating: data.total / data.count,
                    rating_count: data.count
                };
            }
        }
        
        return filteredRatings;
    }

    function fetchMenus(date, openTabs = new Set()) {

        fetch(`/api/menus?date=${date}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Filter ratings to only include foods in today's menu
                ratings = filterRatingsByMenu(ratings, data);
                
                const menusContainer = document.getElementById("menus-container");
                menusContainer.innerHTML = ""; // Clear previous menus
                for (const diningHall in data) {
                    const diningHallId = `dining-hall-content-${diningHall}`;
                    const diningHallDiv = document.createElement("div");
                    diningHallDiv.classList.add("dining-hall");

                    const diningHallTitle = document.createElement("h2");
                    diningHallTitle.textContent = diningHall;
                    diningHallDiv.appendChild(diningHallTitle);

                    const diningHallContent = document.createElement("div");
                    diningHallContent.id = diningHallId;
                    diningHallContent.classList.add("dining-hall-content");
                    if (openTabs.has(diningHallId)) {
                        diningHallContent.classList.add("active");
                    }
                    diningHallDiv.appendChild(diningHallContent);

                    const currentMeal = getCurrentMeal(diningHall);
                    if (currentMeal === null) {
                        const closedMessage = document.createElement("p");
                        closedMessage.textContent = "This dining hall is currently closed.";
                       diningHallContent.appendChild(closedMessage);
                    }

                    // Render meals in fixed order
                    const orderedMeals = ["breakfast", "lunch", "dinner"].filter(m => data[diningHall].hasOwnProperty(m));
                    for (const meal of orderedMeals) {
                        const mealId = `meal-content-${diningHall}-${meal}`;
                        const mealDiv = document.createElement("div");
                        mealDiv.classList.add("meal");

                        const mealTitle = document.createElement("h3");
                        mealTitle.textContent = meal.charAt(0).toUpperCase() + meal.slice(1);
                        mealDiv.appendChild(mealTitle);

                        const mealContent = document.createElement("div");
                        mealContent.id = mealId;
                        mealContent.classList.add("meal-content");
                        if (openTabs.has(mealId) || (currentMeal && meal.toLowerCase() === currentMeal.toLowerCase() && openTabs.size === 0)) {
                            mealContent.classList.add("active");
                        }
                        mealDiv.appendChild(mealContent);

                        if (data[diningHall][meal] && Object.keys(data[diningHall][meal]).length > 0) {
                            for (const station in data[diningHall][meal]) {
                                const stationId = `station-content-${diningHall}-${meal}-${station}`;
                                const stationDiv = document.createElement("div");
                                stationDiv.classList.add("station");

                                const stationTitle = document.createElement("h4");
                                stationTitle.textContent = station;
                                stationDiv.appendChild(stationTitle);

                                const menuList = document.createElement("ul");
                                menuList.id = stationId;
                                if (openTabs.has(stationId)) {
                                    menuList.classList.add("active");
                                }
                                const items = data[diningHall][meal][station];
                                
                                // Show station rating if available (already filtered by menu)
                                if (ratings.stations[`${station}_${diningHall}`]) {
                                    const avgRating = ratings.stations[`${station}_${diningHall}`].avg_rating;
                                    stationTitle.appendChild(renderStars(avgRating, null, false));
                                }
                                if (!items || items.length === 0) {
                                    const emptyHint = document.createElement('p');
                                    emptyHint.classList.add('empty-hint');
                                    emptyHint.textContent = 'No items here yet.';
                                    mealContent.appendChild(emptyHint);
                                    continue;
                                }
                                items.forEach(item => {
                                    const listItem = document.createElement("li");

                                    const foodItemContainer = document.createElement('div');
                                    foodItemContainer.classList.add('food-item-container');

                                    const foodItemName = document.createElement('span');
                                    foodItemName.classList.add('food-item-name');
                                    foodItemName.textContent = item.name;

                                    foodItemContainer.appendChild(foodItemName);

                                    // Community rating row (read-only)
                                    const communityRow = document.createElement('div');
                                    communityRow.classList.add('community-rating-row');
                                    const communityLabel = document.createElement('span');
                                    communityLabel.textContent = 'Community';
                                    communityLabel.classList.add('rating-label');
                                    communityRow.appendChild(communityLabel);

                                    const foodRatingKey = `${item.name}_${station}_${diningHall}_${item.meal}`;
                                    const communityObj = ratings.foods[foodRatingKey] || { avg_rating: 0, rating_count: 0 };
                                    const communityStars = renderStars(communityObj.avg_rating, null, false);
                                    communityRow.appendChild(communityStars);
                                    // Histogram tooltip
                                    if (communityObj.dist) {
                                        const hist = document.createElement('div');
                                        hist.classList.add('histogram');
                                        const total = Object.values(communityObj.dist).reduce((a,b)=>a+b,0) || 1;
                                        for (let i=1;i<=5;i++) {
                                            const bar = document.createElement('div');
                                            bar.classList.add('bar');
                                            bar.style.height = `${(communityObj.dist[i] / total) * 32 + 2}px`;
                                            bar.title = `${i}★: ${communityObj.dist[i]||0}`;
                                            hist.appendChild(bar);
                                        }
                                        communityRow.appendChild(hist);
                                    }
                                    const countSpan = document.createElement('span');
                                    countSpan.classList.add('rating-count');
                                    countSpan.textContent = ` ${communityObj.rating_count || 0}`;
                                    communityRow.appendChild(countSpan);

                                    // Your rating row (interactive)
                                    const yourRow = document.createElement('div');
                                    yourRow.classList.add('your-rating-row');
                                    const yourLabel = document.createElement('span');
                                    yourLabel.textContent = 'Your rating';
                                    yourLabel.classList.add('rating-label');
                                    yourRow.appendChild(yourLabel);
                                    const myRating = userRatings[item.id] ? parseInt(userRatings[item.id], 10) : 0;
                                    const yourStars = renderStars(myRating, item.id, true);
                                    yourStars.classList.add('your-stars');
                                    yourStars.dataset.foodId = item.id;
                                    yourRow.appendChild(yourStars);

                                    if (!communityObj.rating_count) {
                                        const hint = document.createElement('span');
                                        hint.classList.add('empty-hint');
                                        hint.textContent = 'Be the first to rate this item';
                                        communityRow.appendChild(hint);
                                    }

                                    foodItemContainer.appendChild(communityRow);
                                    foodItemContainer.appendChild(yourRow);

                                    listItem.appendChild(foodItemContainer);
                                    
                                    menuList.appendChild(listItem);
                                });
                                stationDiv.appendChild(menuList);
                                mealContent.appendChild(stationDiv);

                                stationTitle.addEventListener("click", function() {
                                    const isActive = menuList.classList.toggle("active");
                                    
                                    // Close sibling stations at same level (within the same meal)
                                    const siblingStations = mealContent.querySelectorAll('.station ul');
                                    siblingStations.forEach(sib => {
                                        if (sib !== menuList) {
                                            sib.classList.remove('active');
                                        }
                                    });
                                    
                                    if (!isActive) {
                                        const innerActive = menuList.querySelectorAll('.active');
                                        innerActive.forEach(el => el.classList.remove('active'));
                                    }
                                });
                            }
                        } else {
                            const noMenu = document.createElement("p");
                            noMenu.textContent = "Menu not available";
                            mealContent.appendChild(noMenu);
                        }
                        
                        // Add meal rating if available (already filtered by menu)
                        if (ratings.meals[`${diningHall}_${meal}`]) {
                            const avgRating = ratings.meals[`${diningHall}_${meal}`].avg_rating;
                            const starRating = renderStars(avgRating, null, false);
                            starRating.classList.add('meal-star-rating');
                            mealTitle.appendChild(starRating);
                        }
                        
                        diningHallContent.appendChild(mealDiv)

                        mealTitle.addEventListener("click", function() {
                            const isActive = mealContent.classList.toggle("active");
                            // Close sibling meals at same level
                            const siblingMeals = mealDiv.parentElement.querySelectorAll('.meal .meal-content');
                            siblingMeals.forEach(sib => {
                                if (sib !== mealContent) {
                                    sib.classList.remove('active');
                                }
                            });
                            if (!isActive) {
                                const innerActive = mealContent.querySelectorAll('.active');
                                innerActive.forEach(el => el.classList.remove('active'));
                            }
                        });
                    }
                    
                    // Add dining hall rating if available (already filtered by menu)
                    if (ratings.dining_halls[diningHall]) {
                        const avgRating = ratings.dining_halls[diningHall].avg_rating;
                        diningHallTitle.appendChild(renderStars(avgRating, null, false));
                    }
                    
                    menusContainer.appendChild(diningHallDiv);

                    diningHallTitle.addEventListener("click", function() {
                        const isActive = diningHallContent.classList.toggle("active");
                        
                        // Close sibling dining halls at same level
                        const siblingHalls = document.querySelectorAll('.dining-hall .dining-hall-content');
                        siblingHalls.forEach(sib => {
                            if (sib !== diningHallContent) {
                                sib.classList.remove('active');
                                // Also close all nested active elements
                                const innerActive = sib.querySelectorAll('.active');
                                innerActive.forEach(el => el.classList.remove('active'));
                            }
                        });
                        
                        if (!isActive) {
                            const innerActive = diningHallContent.querySelectorAll('.active');
                            innerActive.forEach(el => el.classList.remove('active'));
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching menus:', error);
                const menusContainer = document.getElementById("menus-container");
                menusContainer.innerHTML = `<p class="error-message">Could not load the menu at this time. Please try again later.</p>`;
            });
    }

    function updateRatingsInPlace() {
        // Update community ratings without full re-render
        document.querySelectorAll('.community-rating-row').forEach(row => {
            const foodId = row.closest('li').querySelector('.your-stars')?.dataset.foodId;
            if (foodId) {
                // Find the food key from the item data - use the original meal slug from the menu data
                const foodName = row.closest('li').querySelector('.food-item-name').textContent;
                const station = row.closest('.station').querySelector('h4').textContent;
                const diningHall = row.closest('.dining-hall').querySelector('h2').textContent;
                
                // Get the original meal slug from the menu data, not the normalized display name
                const mealDiv = row.closest('.meal');
                const mealId = mealDiv.id; // e.g., "meal-content-Burge-lunch"
                const mealSlug = mealId.split('-').pop(); // Extract "lunch" from the ID
                
                const foodKey = `${foodName}_${station}_${diningHall}_${mealSlug}`;
                
                const communityObj = ratings.foods[foodKey] || { avg_rating: 0, rating_count: 0 };
                
                // Update stars
                const starsContainer = row.querySelector('.star-rating-container');
                if (starsContainer) {
                    const starsInner = starsContainer.querySelector('.stars-inner');
                    const ratingValue = starsContainer.querySelector('.rating-value');
                    if (starsInner && ratingValue) {
                        const safeRating = isFinite(communityObj.avg_rating) && !isNaN(communityObj.avg_rating) ? communityObj.avg_rating : 0;
                        starsInner.style.width = `${(safeRating / 5) * 100}%`;
                        ratingValue.textContent = `(${safeRating.toFixed(2)})`;
                    }
                }
                
                // Update count
                const countSpan = row.querySelector('.rating-count');
                if (countSpan) {
                    countSpan.textContent = ` ${communityObj.rating_count || 0}`;
                }
                
                // Update histogram if it exists
                const existingHistogram = row.querySelector('.histogram');
                if (existingHistogram && communityObj.dist) {
                    existingHistogram.remove();
                    const hist = document.createElement('div');
                    hist.classList.add('histogram');
                    const total = Object.values(communityObj.dist).reduce((a,b)=>a+b,0) || 1;
                    for (let i=1;i<=5;i++) {
                        const bar = document.createElement('div');
                        bar.classList.add('bar');
                        bar.style.height = `${(communityObj.dist[i] / total) * 32 + 2}px`;
                        bar.title = `${i}★: ${communityObj.dist[i]||0}`;
                        hist.appendChild(bar);
                    }
                    row.appendChild(hist);
                }
            }
        });
    }

    fetchRatings().then(() => {
        fetchMenus(dateInput.value);
    });

    dateInput.addEventListener("change", function() {
        fetchMenus(this.value);
    });
});