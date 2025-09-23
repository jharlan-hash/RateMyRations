/**
 * MenuContainer Component
 * Displays dining hall menus with collapsible sections
 */
import BaseComponent from './BaseComponent.js';
import { DINING_HALLS, MEALS, CSS_CLASSES } from '../utils/constants.js';
import { getCurrentMeal } from '../utils/helpers.js';

class MenuContainer extends BaseComponent {
  constructor() {
    super();
    this.menus = {};
    this.ratings = {};
    this.userRatings = {};
    this.expandedSections = new Set();
    this.currentDate = new Date().toISOString().split('T')[0];
  }
  
  static get observedAttributes() {
    return ['date'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.currentDate = this.getAttributeValue('date', new Date().toISOString().split('T')[0]);
      this.render();
    }
  }
  
  getTemplate() {
    if (!this.menus || Object.keys(this.menus).length === 0) {
      return this.getEmptyStateTemplate();
    }
    
    return `
      <div class="menu-container">
        ${this.generateDiningHallSections()}
      </div>
    `;
  }
  
  getEmptyStateTemplate() {
    return `
      <div class="menu-container empty">
        <div class="empty-state">
          <h3>No menus available</h3>
          <p>Menus for ${this.currentDate} are not yet available.</p>
          <button class="refresh-btn" type="button">Refresh</button>
        </div>
      </div>
    `;
  }
  
  generateDiningHallSections() {
    return Object.values(DINING_HALLS).map(diningHall => {
      const hallMenus = this.menus[diningHall] || {};
      const hasMenus = Object.keys(hallMenus).length > 0;
      
      if (!hasMenus) return '';
      
      return `
        <div class="dining-hall-section" data-dining-hall="${diningHall}">
          <div class="dining-hall-header" data-section="${diningHall}">
            <h2 class="dining-hall-title">${diningHall}</h2>
            <div class="dining-hall-rating">
              ${this.generateDiningHallRating(diningHall)}
            </div>
            <button class="expand-btn" aria-expanded="false">
              <span class="expand-icon">▼</span>
            </button>
          </div>
          <div class="dining-hall-content">
            ${this.generateMealSections(diningHall, hallMenus)}
          </div>
        </div>
      `;
    }).join('');
  }
  
  generateMealSections(diningHall, hallMenus) {
    const mealOrder = [MEALS.BREAKFAST, MEALS.LUNCH, MEALS.DINNER];
    
    return mealOrder.map(meal => {
      const mealData = hallMenus[meal];
      if (!mealData || Object.keys(mealData).length === 0) return '';
      
      const isExpanded = this.expandedSections.has(`${diningHall}-${meal}`);
      const mealRating = this.calculateMealRating(diningHall, meal, mealData);
      
      return `
        <div class="meal-section" data-meal="${meal}">
          <div class="meal-header" data-section="${diningHall}-${meal}">
            <h3 class="meal-title">${this.capitalizeFirst(meal)}</h3>
            <div class="meal-rating">
              ${this.generateMealRating(mealRating)}
            </div>
            <button class="expand-btn" aria-expanded="${isExpanded}">
              <span class="expand-icon">${isExpanded ? '▲' : '▼'}</span>
            </button>
          </div>
          <div class="meal-content ${isExpanded ? 'expanded' : 'collapsed'}">
            ${this.generateStationSections(diningHall, meal, mealData)}
          </div>
        </div>
      `;
    }).join('');
  }
  
  generateStationSections(diningHall, meal, mealData) {
    return Object.entries(mealData).map(([station, foods]) => {
      if (!foods || foods.length === 0) return '';
      
      const stationRating = this.calculateStationRating(diningHall, meal, station, foods);
      
      return `
        <div class="station-section" data-station="${station}">
          <div class="station-header" data-section="${diningHall}-${meal}-${station}">
            <h4 class="station-title">${station}</h4>
            <div class="station-rating">
              ${this.generateStationRating(stationRating)}
            </div>
            <button class="expand-btn" aria-expanded="false">
              <span class="expand-icon">▼</span>
            </button>
          </div>
          <div class="station-content">
            <ul class="food-list">
              ${foods.map(food => this.generateFoodItem(food)).join('')}
            </ul>
          </div>
        </div>
      `;
    }).join('');
  }
  
  generateFoodItem(food) {
    const userRating = this.userRatings[food.id] || 0;
    const communityRating = this.ratings[food.id] || { average: 0, count: 0 };
    
    return `
      <li class="food-item" data-food-id="${food.id}">
        <div class="food-item-container">
          <span class="food-item-name">${food.name}</span>
          <div class="food-ratings">
            <star-rating 
              food-id="${food.id}"
              user-rating="${userRating}"
              community-rating="${communityRating.average}"
              community-count="${communityRating.count}"
              interactive="true">
            </star-rating>
            <star-rating 
              food-id="${food.id}"
              user-rating="${userRating}"
              community-rating="${communityRating.average}"
              community-count="${communityRating.count}"
              interactive="false">
            </star-rating>
          </div>
        </div>
      </li>
    `;
  }
  
  generateDiningHallRating(diningHall) {
    const rating = this.calculateDiningHallRating(diningHall);
    return this.generateRatingDisplay(rating);
  }
  
  generateMealRating(rating) {
    return this.generateRatingDisplay(rating);
  }
  
  generateStationRating(rating) {
    return this.generateRatingDisplay(rating);
  }
  
  generateRatingDisplay(rating) {
    if (!rating || rating.average === 0) {
      return '<span class="no-rating">No ratings</span>';
    }
    
    return `
      <div class="rating-display">
        <span class="rating-stars">${'★'.repeat(Math.round(rating.average))}</span>
        <span class="rating-text">${rating.average.toFixed(1)} (${rating.count})</span>
      </div>
    `;
  }
  
  calculateDiningHallRating(diningHall) {
    const hallMenus = this.menus[diningHall] || {};
    let totalRating = 0;
    let totalCount = 0;
    
    Object.values(hallMenus).forEach(mealData => {
      Object.values(mealData).forEach(foods => {
        foods.forEach(food => {
          const rating = this.ratings[food.id];
          if (rating) {
            totalRating += rating.average * rating.count;
            totalCount += rating.count;
          }
        });
      });
    });
    
    return totalCount > 0 ? {
      average: totalRating / totalCount,
      count: totalCount
    } : null;
  }
  
  calculateMealRating(diningHall, meal, mealData) {
    let totalRating = 0;
    let totalCount = 0;
    
    Object.values(mealData).forEach(foods => {
      foods.forEach(food => {
        const rating = this.ratings[food.id];
        if (rating) {
          totalRating += rating.average * rating.count;
          totalCount += rating.count;
        }
      });
    });
    
    return totalCount > 0 ? {
      average: totalRating / totalCount,
      count: totalCount
    } : null;
  }
  
  calculateStationRating(diningHall, meal, station, foods) {
    let totalRating = 0;
    let totalCount = 0;
    
    foods.forEach(food => {
      const rating = this.ratings[food.id];
      if (rating) {
        totalRating += rating.average * rating.count;
        totalCount += rating.count;
      }
    });
    
    return totalCount > 0 ? {
      average: totalRating / totalCount,
      count: totalCount
    } : null;
  }
  
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  attachEventListeners() {
    // Handle section expansion
    this.addEventListener('click', this.handleSectionClick.bind(this));
    
    // Handle refresh button
    const refreshBtn = this.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', this.handleRefresh.bind(this));
    }
  }
  
  handleSectionClick(event) {
    const expandBtn = event.target.closest('.expand-btn');
    if (!expandBtn) return;
    
    const section = expandBtn.closest('[data-section]');
    if (!section) return;
    
    const sectionId = section.dataset.section;
    const isExpanded = this.expandedSections.has(sectionId);
    
    if (isExpanded) {
      this.expandedSections.delete(sectionId);
    } else {
      // Close other sections at the same level
      this.closeSiblingSections(sectionId);
      this.expandedSections.add(sectionId);
    }
    
    this.updateExpandedState(sectionId, !isExpanded);
    this.state.setState({ expandedSections: this.expandedSections });
  }
  
  closeSiblingSections(sectionId) {
    const parts = sectionId.split('-');
    if (parts.length === 1) {
      // Dining hall level - close other dining halls
      Object.values(DINING_HALLS).forEach(hall => {
        if (hall !== sectionId) {
          this.expandedSections.delete(hall);
        }
      });
    } else if (parts.length === 2) {
      // Meal level - close other meals in same dining hall
      const [diningHall] = parts;
      Object.values(MEALS).forEach(meal => {
        this.expandedSections.delete(`${diningHall}-${meal}`);
      });
    }
  }
  
  updateExpandedState(sectionId, isExpanded) {
    const section = this.querySelector(`[data-section="${sectionId}"]`);
    if (!section) return;
    
    const expandBtn = section.querySelector('.expand-btn');
    const content = section.nextElementSibling;
    const icon = expandBtn.querySelector('.expand-icon');
    
    if (expandBtn) {
      expandBtn.setAttribute('aria-expanded', isExpanded);
    }
    
    if (content) {
      content.classList.toggle('expanded', isExpanded);
      content.classList.toggle('collapsed', !isExpanded);
    }
    
    if (icon) {
      icon.textContent = isExpanded ? '▲' : '▼';
    }
  }
  
  handleRefresh() {
    this.dispatchCustomEvent('refresh-menus', {
      date: this.currentDate
    });
  }
  
  subscribeToState() {
    // Subscribe to menus changes
    this.subscriptions.push(
      this.state.subscribe('menus', (menus) => {
        this.menus = menus;
        this.render();
      })
    );
    
    // Subscribe to ratings changes
    this.subscriptions.push(
      this.state.subscribe('ratings', (ratings) => {
        this.ratings = ratings;
        this.render();
      })
    );
    
    // Subscribe to user ratings changes
    this.subscriptions.push(
      this.state.subscribe('userRatings', (userRatings) => {
        this.userRatings = userRatings;
        this.render();
      })
    );
    
    // Subscribe to expanded sections changes
    this.subscriptions.push(
      this.state.subscribe('expandedSections', (expandedSections) => {
        this.expandedSections = expandedSections;
        this.render();
      })
    );
    
    // Subscribe to current date changes
    this.subscriptions.push(
      this.state.subscribe('currentDate', (date) => {
        this.currentDate = date;
        this.setAttribute('date', date);
      })
    );
  }
  
  afterRender() {
    this.updateFromAttributes();
    this.attachEventListeners();
    
    // Get initial data from state
    this.menus = this.state.getState('menus') || {};
    this.ratings = this.state.getState('ratings') || {};
    this.userRatings = this.state.getState('userRatings') || {};
    this.expandedSections = this.state.getState('expandedSections') || new Set();
    
    // Restore expanded state
    this.expandedSections.forEach(sectionId => {
      this.updateExpandedState(sectionId, true);
    });
  }
}

// Register the custom element
customElements.define('menu-container', MenuContainer);

export default MenuContainer;
