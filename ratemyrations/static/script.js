
document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById("menu-date");
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    let ratings = {};
    let userRatings = JSON.parse(localStorage.getItem("userRatings")) || {};

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
        return fetch("/api/ratings")
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

                    fetch("/api/rate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ food_id: foodId, rating: newRating })
                    }).then(() => {
                        if (newRating === 0) {
                            delete userRatings[foodId];
                        } else {
                            userRatings[foodId] = newRating;
                        }
                        localStorage.setItem("userRatings", JSON.stringify(userRatings));
                        fetchRatings().then(() => fetchMenus(dateInput.value, openTabs));
                    });
                });
            });

            starRatingContainer.appendChild(starRating);
        } else {
            const starsOuter = document.createElement("div");
            starsOuter.classList.add("stars-outer");

            const starsInner = document.createElement("div");
            starsInner.classList.add("stars-inner");
            const starPercentage = (rating / 5) * 100;
            starsInner.style.width = `${starPercentage}%`;

            starsOuter.appendChild(starsInner);
            starRatingContainer.appendChild(starsOuter);

            const ratingValue = document.createElement("span");
            ratingValue.classList.add("rating-value");
            ratingValue.textContent = `(${rating.toFixed(2)})`;
            starRatingContainer.appendChild(ratingValue);
        }


        return starRatingContainer;
    }

    function fetchMenus(date, openTabs = new Set()) {
        fetch(`/api/menus?date=${date}`)
            .then(response => response.json())
            .then(data => {
                const menusContainer = document.getElementById("menus-container");
                menusContainer.innerHTML = ""; // Clear previous menus
                for (const diningHall in data) {
                    const diningHallId = `dining-hall-content-${diningHall}`;
                    const diningHallDiv = document.createElement("div");
                    diningHallDiv.classList.add("dining-hall");

                    const diningHallTitle = document.createElement("h2");
                    diningHallTitle.textContent = diningHall;
                    if (ratings.dining_halls[diningHall]) {
                        const avgRating = ratings.dining_halls[diningHall].avg_rating;
                        diningHallTitle.appendChild(renderStars(avgRating, null, false));
                    }
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

                    for (const meal in data[diningHall]) {
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
                                if (ratings.stations[`${station}_${diningHall}`]) {
                                    const avgRating = ratings.stations[`${station}_${diningHall}`].avg_rating;
                                    stationTitle.appendChild(renderStars(avgRating, null, false));
                                }
                                stationDiv.appendChild(stationTitle);

                                const menuList = document.createElement("ul");
                                menuList.id = stationId;
                                if (openTabs.has(stationId)) {
                                    menuList.classList.add("active");
                                }
                                data[diningHall][meal][station].forEach(item => {
                                    const listItem = document.createElement("li");
                                    listItem.textContent = item.name;

                                    const foodRatingKey = `${item.name}_${station}_${diningHall}_${item.meal}`;
                                    const foodRating = ratings.foods[foodRatingKey] ? ratings.foods[foodRatingKey].avg_rating : 0;
                                    listItem.appendChild(renderStars(foodRating, item.id));
                                    
                                    menuList.appendChild(listItem);
                                });
                                stationDiv.appendChild(menuList);
                                mealContent.appendChild(stationDiv);

                                stationTitle.addEventListener("click", function() {
                                    menuList.classList.toggle("active");
                                });
                            }
                        } else {
                            const noMenu = document.createElement("p");
                            noMenu.textContent = "Menu not available";
                            mealContent.appendChild(noMenu);
                        }
                        diningHallContent.appendChild(mealDiv)

                        mealTitle.addEventListener("click", function() {
                            mealContent.classList.toggle("active");
                        });
                    }
                    menusContainer.appendChild(diningHallDiv);

                    diningHallTitle.addEventListener("click", function() {
                        diningHallContent.classList.toggle("active");
                    });
                }
            });
    }

    fetchRatings().then(() => {
        fetchMenus(dateInput.value);
    });

    dateInput.addEventListener("change", function() {
        fetchMenus(this.value);
    });

    const deleteRatingsBtn = document.getElementById("delete-ratings-btn");
    deleteRatingsBtn.addEventListener("click", () => {
        fetch("/api/delete-ratings", {
            method: "POST"
        }).then(() => {
            localStorage.removeItem("userRatings");
            userRatings = {}; // Clear the userRatings object
            fetchRatings().then(() => fetchMenus(dateInput.value));
        });
    });
});
