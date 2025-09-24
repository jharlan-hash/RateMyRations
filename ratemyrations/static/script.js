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
        console.log('Fetching ratings for date:', dateInput.value);
        return fetch(`/api/ratings?date=${dateInput.value}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Raw ratings data from backend:', data);
                ratings = data;
                return data;
            })
            .catch(error => {
                console.error('Error fetching ratings:', error);
                
                // Handle rate limiting specifically
                if (error.message.includes('HTTP 429')) {
                    console.warn('Rate limited while fetching ratings, keeping existing data');
                    // Don't throw error for rate limiting - keep existing ratings
                    return ratings;
                }
                
                // Don't update ratings if fetch fails - keep existing data
                throw error;
            });
    }

    function renderStars(rating, foodId, isInteractive = true) {
        const starRatingContainer = document.createElement("div");
        starRatingContainer.classList.add("star-rating-container");

        if (isInteractive) {
            const starRating = document.getElementById("star-rating-template").content.cloneNode(true);
            const stars = starRating.querySelectorAll(".star");

            const applyVisual = (val) => {
                stars.forEach(s => {
                    // Clean up any legacy classes
                    s.classList.remove("active");
                    const sVal = parseInt(s.dataset.value, 10);
                    if (sVal <= val) {
                        s.classList.add("rated");
                        s.classList.add("user-rated");
                    } else {
                        s.classList.remove("rated");
                        s.classList.remove("user-rated");
                    }
                });
                // Update userRatings IMMEDIATELY for instant calculations
                if (val === 0) {
                    delete userRatings[foodId];
                } else {
                    userRatings[foodId] = val;
                }

                // Update community rating for this item immediately
                updateCommunityRatingDisplay(starRatingContainer, val);
                
                // Update aggregates live - MUST WORK
                updateLiveAggregates(starRatingContainer, val);
            };

            stars.forEach(star => {
                if (star.dataset.value <= rating) {
                    star.classList.add("rated");
                }
                if (userRatings[foodId] && star.dataset.value <= userRatings[foodId]) {
                    star.classList.add("user-rated");
                }

                star.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const selected = parseInt(star.dataset.value, 10);
                    const current = userRatings[foodId] ? parseInt(userRatings[foodId], 10) : 0;
                    let newRating = (selected === current) ? 0 : selected;

                    // Update visual state immediately using rated/user-rated classes
                    applyVisual(newRating);

                    if (star.dataset._debouncing) return;
                    star.dataset._debouncing = "1";
                    
                    // Add a small delay to prevent rapid-fire requests
                    setTimeout(() => {
                        if (!star.dataset._debouncing) return; // Check if still debouncing
                    fetch("/api/rate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ food_id: foodId, rating: newRating, user_id: browserId, date: dateInput.value })
                    }).then(response => {
                        console.log('Rating submission response:', response.status, response.statusText);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        return response.json();
                    }).then(data => {
                        console.log('Rating submission success:', data);
                        // Update userRatings immediately BEFORE any calculations
                        if (newRating === 0) {
                            delete userRatings[foodId];
                        } else {
                            userRatings[foodId] = newRating;
                        }
                        localStorage.setItem("userRatings", JSON.stringify(userRatings));
                        console.log('Rating updated successfully');
                        
                        // Fetch updated ratings from server to get accurate community data
                        fetchRatings().then(() => {
                            console.log('Refreshed ratings data after submission');
                            // Update community display with fresh server data
                            updateCommunityRatingDisplay(starRatingContainer, newRating);
                            // Force DOM to update, then calculate aggregates
                            requestAnimationFrame(() => {
                                updateLiveAggregates(starRatingContainer, newRating);
                            });
                        }).catch(e => {
                            console.warn('Failed to refresh ratings after submission:', e);
                        });
                    }).catch(error => {
                        console.error('Error updating rating:', error);
                        
                        // Handle rate limiting specifically
                        if (error.message.includes('HTTP 429')) {
                            alert('Rate limit exceeded. Please wait a moment before rating more items.');
                        } else {
                            alert('Failed to update rating. Please try again.');
                        }
                        
                        // Revert the star selection to previous state
                        applyVisual(current);
                    }).finally(() => {
                        delete star.dataset._debouncing;
                    });
                    }, 100); // 100ms delay to prevent rapid-fire requests
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
        // Handle malformed ratings data
        if (!ratings || typeof ratings !== 'object') {
            return {
                foods: {},
                stations: {},
                dining_halls: {},
                meals: {}
            };
        }
        
        // Ensure ratings has the expected structure
        if (!ratings.foods) ratings.foods = {};
        if (!ratings.stations) ratings.stations = {};
        if (!ratings.dining_halls) ratings.dining_halls = {};
        if (!ratings.meals) ratings.meals = {};
        
        // Create a set of food keys that are in today's menu
        const menuFoodKeys = new Set();
        for (const diningHall in menuData) {
            for (const meal in menuData[diningHall]) {
                for (const station in menuData[diningHall][meal]) {
                    const items = menuData[diningHall][meal][station];
                    if (items && items.length > 0) {
                        for (const item of items) {
                            // Use the original meal slug from the menu data, not normalized display name
                            // We need to map back to the original meal slug used in the database
                            // I just wish the menu data was consistent
                            let originalMealSlug = meal;
                            if (diningHall === 'Catlett') {
                                if (meal === 'breakfast') originalMealSlug = 'breakfast-2';
                                else if (meal === 'lunch') originalMealSlug = 'lunch-2';
                                else if (meal === 'dinner') originalMealSlug = 'dinner-2';
                            } else if (diningHall === 'Hillcrest') {
                                if (meal === 'breakfast') originalMealSlug = 'breakfast-3';
                                else if (meal === 'lunch') originalMealSlug = 'lunch-3';
                                // dinner stays 'dinner' for Hillcrest 
                            } else if (diningHall === 'Burge') {
                                if (meal === 'dinner') originalMealSlug = 'dinner-3';
                                // breakfast and lunch stay the same for Burge. Obviously. Because of course they do.
                            }
                            
                            const foodKey = `${item.name}_${station}_${diningHall}_${originalMealSlug}`;
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
            const station = parts[1];
            const diningHall = parts[2];
            const meal = parts[3];
            const stationKey = `${station}_${diningHall}_${meal}`;
            
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
                    diningHallTitle.dataset.originalName = diningHall; // Store original name
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
                        mealTitle.dataset.originalName = meal; // Store original meal name
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
                                stationTitle.dataset.originalName = station; // Store original name
                                stationDiv.appendChild(stationTitle);

                                const menuList = document.createElement("ul");
                                menuList.id = stationId;
                                if (openTabs.has(stationId)) {
                                    menuList.classList.add("active");
                                }
                                const items = data[diningHall][meal][station];
                                
                                // Show station rating if available (already filtered by menu)
                                if (ratings.stations[`${station}_${diningHall}_${meal}`]) {
                                    const avgRating = ratings.stations[`${station}_${diningHall}_${meal}`].avg_rating;
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
                                    listItem.setAttribute('data-food-id', item.id);
                                    listItem.setAttribute('data-meal-slug', item.meal);

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

                                // Store data attributes for event delegation
                                stationTitle.dataset.stationId = stationId;
                                stationTitle.dataset.mealContent = mealId;
                            }
                        } else {
                            const noMenu = document.createElement("p");
                            noMenu.textContent = "Menu not available";
                            mealContent.appendChild(noMenu);
                        }
                        
                        // Add meal rating if available (already filtered by menu)
                        // Check both normalized meal name and original meal slug
                        const normalizedMealKey = `${diningHall}_${meal}`;
                        let mealRatingData = ratings.meals[normalizedMealKey];
                        
                        // If not found, try with original meal slug from first station's first item
                        if (!mealRatingData && data[diningHall][meal]) {
                            const firstStation = Object.keys(data[diningHall][meal])[0];
                            const firstStationItems = data[diningHall][meal][firstStation];
                            if (firstStationItems && firstStationItems.length > 0) {
                                const originalMealSlug = firstStationItems[0].meal;
                                const originalMealKey = `${diningHall}_${originalMealSlug}`;
                                mealRatingData = ratings.meals[originalMealKey];
                            }
                        }
                        
                        if (mealRatingData) {
                            const avgRating = mealRatingData.avg_rating;
                            const starRating = renderStars(avgRating, null, false);
                            starRating.classList.add('meal-star-rating');
                            mealTitle.appendChild(starRating);
                        }
                        
                        diningHallContent.appendChild(mealDiv)

                        // Store data attributes for event delegation
                        mealTitle.dataset.mealId = mealId;
                        mealTitle.dataset.diningHallContent = diningHallId;
                    }
                    
                    // Skip backend dining hall ratings - we calculate them from meal periods instead
                    // Backend uses old method (all food items), we use meal period averaging
                    
                    menusContainer.appendChild(diningHallDiv);

                    // Store data attributes for event delegation
                    diningHallTitle.dataset.diningHallId = diningHallId;
                }

                // After building the menu, calculate dining hall ratings from meal periods
                try { 
                    updateAllAggregatesFromRatings();
                    // Calculate dining hall ratings using meal period averaging (not backend data)
                    Object.keys(data).forEach(diningHall => {
                        updateDiningHallRating(diningHall);
                    });
                } catch (e) { 
                    console.warn('Aggregate update failed:', e); 
                }
            })
            .catch(error => {
                console.error('Error fetching menus:', error);
                const menusContainer = document.getElementById("menus-container");
                let errorMessage = "Could not load the menu at this time. Please try again later.";
                
                // Provide more specific error messages
                if (error.message.includes('HTTP 500')) {
                    errorMessage = "Server error occurred. Please try again later.";
                } else if (error.message.includes('HTTP 404')) {
                    errorMessage = "Menu not found for the selected date.";
                } else if (error.message.includes('Network')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                }
                
                menusContainer.innerHTML = `<p class="error-message">${errorMessage}</p>`;
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

    function updateLiveAggregates(starContainer, newRating) {
        try {
            console.log(`=== updateLiveAggregates called ===`);
            console.log(`newRating: ${newRating}`);
            
            const li = starContainer.closest('li[data-food-id]');
            if (!li) {
                console.warn('Could not find food item li');
                return;
            }
            
            const station = li.closest('.station').querySelector('h4').dataset.originalName;
            const diningHall = li.closest('.dining-hall').querySelector('h2').dataset.originalName;
            const mealElement = li.closest('.meal');
            const mealTitle = mealElement.querySelector('h3').dataset.originalName;
            
            console.log(`Extracted: station=${station}, diningHall=${diningHall}, mealTitle=${mealTitle}`);
            console.log(`Updating aggregates for: ${station} in ${diningHall} ${mealTitle} with rating ${newRating}`);
            
            // Update station aggregate
            updateStationRating(diningHall, station, mealTitle);
            
            // Update meal aggregate  
            updateMealRating(diningHall, mealTitle);
            
            // Update dining hall aggregate
            updateDiningHallRating(diningHall);
            
        } catch (e) {
            console.error('Failed to update live aggregates:', e);
        }
    }

    function updateCommunityRatingDisplay(starContainer, newRating) {
        try {
            const li = starContainer.closest('li[data-food-id]');
            if (!li) return;
            
            const communityRow = li.querySelector('.community-rating-row');
            if (!communityRow) return;
            
            // Get the food key to calculate true community average
            const foodName = li.querySelector('.food-item-name').textContent;
            const station = li.closest('.station').querySelector('h4').dataset.originalName;
            const diningHall = li.closest('.dining-hall').querySelector('h2').dataset.originalName;
            const mealDiv = li.closest('.meal');
            const mealTitle = mealDiv.querySelector('h3');
            const mealSlug = mealTitle ? mealTitle.dataset.originalName : '';
            
            // Map to original meal slug
            let originalMealSlug = mealSlug;
            if (diningHall === 'Catlett') {
                if (mealSlug === 'breakfast') originalMealSlug = 'breakfast-2';
                else if (mealSlug === 'lunch') originalMealSlug = 'lunch-2';
                else if (mealSlug === 'dinner') originalMealSlug = 'dinner-2';
            } else if (diningHall === 'Hillcrest') {
                if (mealSlug === 'breakfast') originalMealSlug = 'breakfast-3';
                else if (mealSlug === 'lunch') originalMealSlug = 'lunch-3';
            } else if (diningHall === 'Burge') {
                if (mealSlug === 'dinner') originalMealSlug = 'dinner-3';
            }
            
            const foodKey = `${foodName}_${station}_${diningHall}_${originalMealSlug}`;
            const foodId = parseInt(li.getAttribute('data-food-id'), 10);
            
            // Get community rating from server
            const communityRating = ratings.foods[foodKey];
            const userRating = userRatings[foodId] ? parseInt(userRatings[foodId], 10) : 0;
            
            // The server data ALREADY includes all submitted ratings, including this user's
            // So we should just display the server data as-is, not add the user rating again
            let trueAverage = 0;
            let trueCount = 0;
            
            if (communityRating && communityRating.avg_rating > 0) {
                // Use server data directly - it's already accurate
                trueAverage = communityRating.avg_rating;
                trueCount = communityRating.rating_count;
                
                console.log(`Using server community data: ${trueAverage.toFixed(2)} stars, ${trueCount} ratings`);
            } else if (userRating > 0) {
                // No server data yet, but user just rated - show user rating
                // This handles the case where user is first to rate
                trueAverage = userRating;
                trueCount = 1;
                
                console.log(`No server data, using user rating: ${userRating} stars`);
            }
            
            console.log(`Community display update: ${foodName}, True average: ${trueAverage}, Count: ${trueCount}`);
            
            const starsInner = communityRow.querySelector('.stars-inner');
            const ratingValue = communityRow.querySelector('.rating-value');
            const countSpan = communityRow.querySelector('.rating-count');
            
            if (starsInner) {
                const percentage = (trueAverage / 5) * 100;
                starsInner.style.width = `${percentage}%`;
            }
            
            if (ratingValue) {
                ratingValue.textContent = `(${trueAverage.toFixed(2)})`;
            }
            
            if (countSpan) {
                countSpan.textContent = ` ${trueCount}`;
            }
            
            // Update histogram if it exists
            const existingHistogram = communityRow.querySelector('.histogram');
            if (existingHistogram) {
                existingHistogram.remove();
            }
            
            // Create histogram from server data (already includes all ratings)
            if (communityRating && communityRating.dist) {
                const hist = document.createElement('div');
                hist.classList.add('histogram');
                
                // Use server distribution directly - it's already accurate
                const total = Object.values(communityRating.dist).reduce((a,b)=>a+b,0) || 1;
                for (let i=1;i<=5;i++) {
                    const bar = document.createElement('div');
                    bar.classList.add('bar');
                    bar.style.height = `${(communityRating.dist[i] / total) * 32 + 2}px`;
                    bar.title = `${i}★: ${communityRating.dist[i]||0}`;
                    hist.appendChild(bar);
                }
                communityRow.appendChild(hist);
            }
            
        } catch (e) {
            console.warn('Failed to update community rating display:', e);
        }
    }

    function calculateAverageForItems(items) {
        let total = 0;
        let count = 0;
        
        items.forEach(li => {
            const foodId = parseInt(li.getAttribute('data-food-id'), 10);
            
            // Get the food key to look up server-side community ratings
            const foodName = li.querySelector('.food-item-name').textContent;
            const station = li.closest('.station').querySelector('h4').dataset.originalName;
            const diningHall = li.closest('.dining-hall').querySelector('h2').dataset.originalName;
            const mealDiv = li.closest('.meal');
            const mealTitle = mealDiv.querySelector('h3');
            const mealSlug = mealTitle ? mealTitle.dataset.originalName : '';
            
            console.log(`Meal Title: ${mealTitle ? mealTitle.textContent : 'null'}, Original Meal: ${mealSlug}`);
            
            // Map to original meal slug (same logic as in filterRatingsByMenu)
            let originalMealSlug = mealSlug;
            if (diningHall === 'Catlett') {
                if (mealSlug === 'breakfast') originalMealSlug = 'breakfast-2';
                else if (mealSlug === 'lunch') originalMealSlug = 'lunch-2';
                else if (mealSlug === 'dinner') originalMealSlug = 'dinner-2';
            } else if (diningHall === 'Hillcrest') {
                if (mealSlug === 'breakfast') originalMealSlug = 'breakfast-3';
                else if (mealSlug === 'lunch') originalMealSlug = 'lunch-3';
                // dinner stays 'dinner' for Hillcrest 
            } else if (diningHall === 'Burge') {
                if (mealSlug === 'dinner') originalMealSlug = 'dinner-3';
                // breakfast and lunch stay the same for Burge
            }
            
            const foodKey = `${foodName}_${station}_${diningHall}_${originalMealSlug}`;
            
            // Get community rating from server data
            const communityRating = ratings.foods[foodKey];
            const userRating = userRatings[foodId] ? parseInt(userRatings[foodId], 10) : 0;
            
            // Only log for the specific food we're testing
            if (foodName === 'Lemon Basil Salmon') {
                console.log(`🐟 Food: ${foodName}, Key: ${foodKey}`);
                console.log(`🐟 Community rating:`, communityRating);
                console.log(`🐟 User rating: ${userRating}`);
            }
            
            // Use server community data for true crowdsourcing (includes all users' ratings)
            if (communityRating && communityRating.avg_rating > 0) {
                // Use the community average weighted by count (includes all ratings from all users)
                total += communityRating.avg_rating * communityRating.rating_count;
                count += communityRating.rating_count;
                if (foodName === 'Lemon Basil Salmon') {
                    console.log(`🐟 Added community: ${communityRating.avg_rating} * ${communityRating.rating_count} = ${communityRating.avg_rating * communityRating.rating_count}`);
                }
            } else if (userRating > 0) {
                // Fallback to user rating if no community data (shouldn't happen after server refresh)
                total += userRating;
                count += 1;
                if (foodName === 'Lemon Basil Salmon') {
                    console.log(`🐟 Added user rating: ${userRating}`);
                }
            }
        });
        
        const average = count > 0 ? total / count : 0;
        console.log(`Calculated average: ${total}/${count} = ${average.toFixed(2)}`);
        return average;
    }

    function updateStationRating(diningHall, station, specificMealPeriod) {
        console.log(`=== updateStationRating called ===`);
        console.log(`Looking for: ${station} in ${diningHall} ${specificMealPeriod}`);
        
        // Find all food items in this SPECIFIC station within the SPECIFIC meal period
        const stationItems = [];
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (hallTitle && hallTitle.dataset.originalName === diningHall) {
                hall.querySelectorAll('.meal').forEach(meal => {
                    const mealTitle = meal.querySelector('h3');
                    const mealName = mealTitle ? mealTitle.dataset.originalName : 'NO_TITLE';
                    
                    // Only look in the specific meal period
                    if (mealName === specificMealPeriod) {
                        meal.querySelectorAll('.station').forEach(st => {
                            const stTitle = st.querySelector('h4');
                            if (stTitle && stTitle.dataset.originalName === station) {
                                st.querySelectorAll('li[data-food-id]').forEach(li => {
                                    stationItems.push(li);
                                });
                            }
                        });
                    }
                });
            }
        });
        
        console.log(`Found ${stationItems.length} items for station calculation`);
        const avg = calculateAverageForItems(stationItems);
        console.log(`Calculated station average: ${avg.toFixed(2)}`);
        
        // Update ONLY the station header in the specific meal period
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (hallTitle && hallTitle.dataset.originalName === diningHall) {
                hall.querySelectorAll('.meal').forEach(meal => {
                    const mealTitle = meal.querySelector('h3');
                    const mealName = mealTitle ? mealTitle.dataset.originalName : 'NO_TITLE';
                    
                    // Only update in the specific meal period
                    if (mealName === specificMealPeriod) {
                        meal.querySelectorAll('.station').forEach(st => {
                            const stTitle = st.querySelector('h4');
                            if (stTitle && stTitle.dataset.originalName === station) {
                                // Remove existing rating display
                                const existing = stTitle.querySelector('.star-rating-container');
                                if (existing) existing.remove();
                                
                                // Add new rating display if we have ratings
                                if (avg > 0) {
                                    const ratingDisplay = renderStars(avg, null, false);
                                    stTitle.appendChild(ratingDisplay);
                                }
                            }
                        });
                    }
                });
            }
        });
        
        console.log(`=== updateStationRating complete ===`);
    }

    function updateMealRating(diningHall, mealTitle) {
        console.log(`=== updateMealRating called ===`);
        console.log(`Looking for meal: ${mealTitle} in ${diningHall}`);
        
        // Find all food items in this meal
        const mealItems = [];
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (hallTitle && hallTitle.dataset.originalName === diningHall) {
                hall.querySelectorAll('.meal').forEach(meal => {
                    const mTitle = meal.querySelector('h3');
                    if (mTitle && mTitle.dataset.originalName === mealTitle) {
                        meal.querySelectorAll('li[data-food-id]').forEach(li => {
                            mealItems.push(li);
                        });
                    }
                });
            }
        });
        
        console.log(`Found ${mealItems.length} items for meal calculation`);
        const avg = calculateAverageForItems(mealItems);
        console.log(`Calculated meal average: ${avg.toFixed(2)}`);
        
        // Update meal header rating display
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (hallTitle && hallTitle.dataset.originalName === diningHall) {
                hall.querySelectorAll('.meal').forEach(meal => {
                    const mTitle = meal.querySelector('h3');
                    if (mTitle && mTitle.dataset.originalName === mealTitle) {
                        // Remove existing rating display
                        const existing = mTitle.querySelector('.star-rating-container');
                        if (existing) existing.remove();
                        
                        // Add new rating display if we have ratings
                        if (avg > 0) {
                            const ratingDisplay = renderStars(avg, null, false);
                            ratingDisplay.classList.add('meal-star-rating');
                            mTitle.appendChild(ratingDisplay);
                        }
                    }
                });
            }
        });
        
        console.log(`=== updateMealRating complete ===`);
    }

    function updateDiningHallRating(diningHall) {
        console.log(`=== updateDiningHallRating called ===`);
        console.log(`Looking for dining hall: ${diningHall}`);
        
        // Calculate meal period averages first, then average those
        const mealAverages = [];
        
        // Find all meals in this dining hall
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (hallTitle && hallTitle.dataset.originalName === diningHall) {
                hall.querySelectorAll('.meal').forEach(meal => {
                    const mealTitle = meal.querySelector('h3');
                    const mealName = mealTitle ? mealTitle.dataset.originalName : '';
                    
                    // Get all food items in this meal
                    const mealItems = [];
                    meal.querySelectorAll('li[data-food-id]').forEach(li => {
                        mealItems.push(li);
                    });
                    
                    if (mealItems.length > 0) {
                        const mealAvg = calculateAverageForItems(mealItems);
                        if (mealAvg > 0) {
                            mealAverages.push(mealAvg);
                            console.log(`Meal ${mealName}: ${mealAvg.toFixed(2)} stars`);
                        }
                    }
                });
            }
        });
        
        // Average the meal period averages
        const diningHallAvg = mealAverages.length > 0 ? 
            mealAverages.reduce((sum, avg) => sum + avg, 0) / mealAverages.length : 0;
        
        console.log(`Calculated dining hall average from ${mealAverages.length} meal periods: ${diningHallAvg.toFixed(2)}`);
        
        // Update dining hall header rating display
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (hallTitle && hallTitle.dataset.originalName === diningHall) {
                // Remove existing rating display
                const existing = hallTitle.querySelector('.star-rating-container');
                if (existing) existing.remove();
                
                // Add new rating display if we have ratings
                if (diningHallAvg > 0) {
                    const ratingDisplay = renderStars(diningHallAvg, null, false);
                    hallTitle.appendChild(ratingDisplay);
                }
            }
        });
        
        console.log(`=== updateDiningHallRating complete ===`);
    }

    function updateAllAggregatesFromRatings() {
        console.log('updateAllAggregatesFromRatings called - now using direct updates');
        // This function is replaced by direct live updates in updateLiveAggregates
        // Just do nothing to avoid errors
    }

    function applyHallAverageDirect(diningHall, average) {
        let applied = false;
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const title = hall.querySelector('h2');
            if (!title) return;
            const name = (title.firstChild ? title.firstChild.textContent : title.textContent).trim();
            if (name !== diningHall) return;
            let container = title.querySelector('.star-rating-container');
            if (!container) {
                title.appendChild(renderStars(average, null, false));
                container = title.querySelector('.star-rating-container');
            }
            applyAggregateToStars(container, average);
            applied = true;
        });
        return applied;
    }

    function applyMealAverageDirect(diningHall, mealSlug, average) {
        const mealBase = mealSlug.includes('breakfast') ? 'breakfast' : mealSlug.includes('lunch') ? 'lunch' : 'dinner';
        const mealContent = document.getElementById(`meal-content-${diningHall}-${mealBase}`);
        if (!mealContent) return false;
        const mealDiv = mealContent.closest('.meal');
        const title = mealDiv ? mealDiv.querySelector('h3') : null;
        if (!title) return false;
        let container = title.parentElement.querySelector('.meal-star-rating .star-rating-container')
          || title.parentElement.querySelector('.star-rating-container');
        if (!container) {
            const appended = renderStars(average, null, false);
            appended.classList.add('meal-star-rating');
            title.parentElement.appendChild(appended);
            container = appended;
        }
        applyAggregateToStars(container, average);
        return true;
    }

    function applyStationAverageDirect(diningHall, station, average) {
        let applied = false;
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (!hallTitle) return;
            const name = (hallTitle.firstChild ? hallTitle.firstChild.textContent : hallTitle.textContent).trim();
            if (name !== diningHall) return;
            hall.querySelectorAll('.station').forEach(st => {
                const title = st.querySelector('h4');
                if (title && title.textContent.trim() === station) {
                    let container = st.querySelector('.station-rating .star-rating-container');
                    if (!container) {
                        const wrapper = st.querySelector('.station-rating');
                        if (wrapper) {
                            wrapper.innerHTML = '';
                            wrapper.appendChild(renderStars(average, null, false));
                            container = wrapper.querySelector('.star-rating-container');
                        }
                    }
                    applyAggregateToStars(container, average);
                    applied = true;
                }
            });
        });
        return applied;
    }

    function applyAggregateToStars(containerEl, average) {
        if (!containerEl) return;
        const starsInner = containerEl.querySelector('.stars-inner');
        const ratingValue = containerEl.querySelector('.rating-value');
        const safe = isFinite(average) && !isNaN(average) ? average : 0;
        if (starsInner) starsInner.style.width = `${(safe / 5) * 100}%`;
        if (ratingValue) ratingValue.textContent = `(${safe.toFixed(2)})`;
    }

    function updateStationAggregate(diningHall, station) {
        const aggregates = computeVisibleAggregates();
        const key = `${station}_${diningHall}_${meal}`;
        const agg = aggregates.stations[key];
        if (!agg || agg.count === 0) return;
        const avg = agg.total / agg.count;

        document.querySelectorAll('.dining-hall').forEach(hall => {
            const hallTitle = hall.querySelector('h2');
            if (!hallTitle) return;
            const name = (hallTitle.firstChild ? hallTitle.firstChild.textContent : hallTitle.textContent).trim();
            if (name !== diningHall) return;

            hall.querySelectorAll('.station').forEach(st => {
                const title = st.querySelector('h4');
                if (title && title.textContent.trim() === station) {
                    let container = st.querySelector('.station-rating .star-rating-container');
                    if (!container) {
                        const wrapper = st.querySelector('.station-rating');
                        if (wrapper) {
                            wrapper.innerHTML = '';
                            wrapper.appendChild(renderStars(avg, null, false));
                            container = wrapper.querySelector('.star-rating-container');
                        }
                    }
                    applyAggregateToStars(container, avg);
                }
            });
        });
    }

    function updateMealAggregate(diningHall, mealSlug) {
        const aggregates = computeVisibleAggregates();
        const key = `${diningHall}_${mealSlug}`;
        const agg = aggregates.meals[key];
        if (!agg || agg.count === 0) return;
        const avg = agg.total / agg.count;

        const mealBase = mealSlug.includes('breakfast') ? 'breakfast' : mealSlug.includes('lunch') ? 'lunch' : 'dinner';
        const mealContent = document.getElementById(`meal-content-${diningHall}-${mealBase}`);
        if (mealContent) {
            const mealDiv = mealContent.closest('.meal');
            const title = mealDiv ? mealDiv.querySelector('h3') : null;
            if (title) {
                let container = title.parentElement.querySelector('.meal-star-rating .star-rating-container')
                  || title.parentElement.querySelector('.star-rating-container');
                if (!container) {
                    // Create if missing
                    const appended = renderStars(avg, null, false);
                    appended.classList.add('meal-star-rating');
                    title.parentElement.appendChild(appended);
                    container = appended;
                }
                applyAggregateToStars(container, avg);
            }
        }
    }

    function updateDiningHallAggregate(diningHall) {
        const aggregates = computeVisibleAggregates();
        const agg = aggregates.halls[diningHall];
        if (!agg || agg.count === 0) return;
        const avg = agg.total / agg.count;
        // Find dining hall title
        document.querySelectorAll('.dining-hall').forEach(hall => {
            const title = hall.querySelector('h2');
            if (!title) return;
            const name = (title.firstChild ? title.firstChild.textContent : title.textContent).trim();
            if (name !== diningHall) return;
            let container = title.querySelector('.star-rating-container');
            if (!container) {
                title.appendChild(renderStars(avg, null, false));
                container = title.querySelector('.star-rating-container');
            }
            applyAggregateToStars(container, avg);
        });
    }

    // Load ratings first, then menus to ensure ratings are available
    fetchRatings().then(() => {
        fetchMenus(dateInput.value);
    }).catch(error => {
        console.error('Error loading initial data:', error);
    });

    dateInput.addEventListener("change", function() {
        console.log('Date changed to:', this.value);
        // Load ratings first, then menus
        fetchRatings().then(() => {
            console.log('Ratings fetched for new date:', ratings);
            fetchMenus(this.value);
        }).catch(error => {
            console.error('Error loading data for date change:', error);
        });
    });

    // Event delegation to handle all clicks without memory leaks
    document.addEventListener("click", function(event) {
        const target = event.target;
        
        // Handle dining hall title clicks
        if (target.tagName === "H2" && target.dataset.diningHallId) {
            const diningHallContent = document.getElementById(target.dataset.diningHallId);
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
        }
        
        // Handle meal title clicks
        else if (target.tagName === "H3" && target.dataset.mealId) {
            const mealContent = document.getElementById(target.dataset.mealId);
            const diningHallContent = document.getElementById(target.dataset.diningHallContent);
            const isActive = mealContent.classList.toggle("active");
            
            // Close sibling meals at same level
            const siblingMeals = diningHallContent.querySelectorAll('.meal .meal-content');
            siblingMeals.forEach(sib => {
                if (sib !== mealContent) {
                    sib.classList.remove('active');
                }
            });
            
            if (!isActive) {
                const innerActive = mealContent.querySelectorAll('.active');
                innerActive.forEach(el => el.classList.remove('active'));
            }
        }
        
        // Handle station title clicks
        else if (target.tagName === "H4" && target.dataset.stationId) {
            const menuList = document.getElementById(target.dataset.stationId);
            const mealContent = document.getElementById(target.dataset.mealContent);
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
        }
    });
});