/**
 * StarRating Component
 * Handles interactive star ratings with immediate UI updates
 */
import BaseComponent from './BaseComponent.js';
import { RATING_VALUES, EVENTS, CSS_CLASSES } from '../utils/constants.js';

class StarRating extends BaseComponent {
  constructor() {
    super();
    this.foodId = null;
    this.userRating = 0;
    this.communityRating = 0;
    this.communityCount = 0;
    this.isInteractive = true;
    this.isSubmitting = false;
  }
  
  static get observedAttributes() {
    return ['food-id', 'user-rating', 'community-rating', 'community-count', 'interactive'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
      this.render();
    }
  }
  
  updateFromAttributes() {
    this.foodId = this.getAttributeValue('food-id');
    this.userRating = parseInt(this.getAttributeValue('user-rating', '0'));
    this.communityRating = parseFloat(this.getAttributeValue('community-rating', '0'));
    this.communityCount = parseInt(this.getAttributeValue('community-count', '0'));
    this.isInteractive = this.getBooleanAttribute('interactive');
  }
  
  getTemplate() {
    const ratingType = this.isInteractive ? 'Your rating' : 'Community';
    const ratingValue = this.isInteractive ? this.userRating : this.communityRating;
    const ratingCount = this.isInteractive ? '' : ` (${this.communityCount})`;
    
    return `
      <div class="star-rating-container ${this.isInteractive ? 'interactive' : 'readonly'}">
        <div class="rating-label">${ratingType}${ratingCount}</div>
        <div class="star-rating" data-food-id="${this.foodId}">
          ${this.generateStars(ratingValue)}
        </div>
        ${this.isInteractive ? this.generateHistogram() : ''}
      </div>
    `;
  }
  
  generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= rating;
      const isHalf = i === Math.ceil(rating) && rating % 1 !== 0;
      
      stars += `
        <span class="star ${isActive ? 'active' : ''} ${isHalf ? 'half' : ''}" 
              data-value="${i}" 
              data-food-id="${this.foodId}">
          ★
        </span>
      `;
    }
    return stars;
  }
  
  generateHistogram() {
    if (!this.communityCount) return '';
    
    // Generate histogram data (simplified for now)
    const histogram = this.generateHistogramData();
    
    return `
      <div class="rating-histogram" title="Community rating distribution">
        ${histogram.map((bar, index) => `
          <div class="histogram-bar" style="height: ${bar}%" data-rating="${index + 1}"></div>
        `).join('')}
      </div>
    `;
  }
  
  generateHistogramData() {
    // Simplified histogram - in real implementation, this would come from API
    const base = this.communityRating;
    return [
      Math.max(0, base - 1) * 20,
      Math.max(0, base - 0.5) * 20,
      base * 20,
      Math.min(100, (base + 0.5) * 20),
      Math.min(100, (base + 1) * 20)
    ];
  }
  
  attachEventListeners() {
    if (!this.isInteractive) return;
    
    const starRating = this.querySelector('.star-rating');
    if (!starRating) return;
    
    starRating.addEventListener('click', this.handleStarClick.bind(this));
    starRating.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    starRating.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }
  
  handleStarClick(event) {
    if (this.isSubmitting) return;
    
    const star = event.target.closest('.star');
    if (!star) return;
    
    event.stopPropagation();
    
    const newRating = parseInt(star.dataset.value);
    const previousRating = this.userRating;
    
    // If clicking the same rating, remove it
    const finalRating = (newRating === previousRating) ? 0 : newRating;
    
    // Update UI immediately
    this.updateStarDisplay(finalRating);
    
    // Submit to API
    this.submitRating(finalRating, previousRating);
  }
  
  handleMouseEnter(event) {
    if (this.isSubmitting) return;
    
    const star = event.target.closest('.star');
    if (!star) return;
    
    const hoverRating = parseInt(star.dataset.value);
    this.updateStarDisplay(hoverRating, true);
  }
  
  handleMouseLeave(event) {
    if (this.isSubmitting) return;
    
    // Revert to actual rating
    this.updateStarDisplay(this.userRating);
  }
  
  updateStarDisplay(rating, isHover = false) {
    const stars = this.querySelectorAll('.star');
    stars.forEach((star, index) => {
      const starValue = index + 1;
      star.classList.toggle('active', starValue <= rating);
      star.classList.toggle('hover', isHover && starValue <= rating);
    });
  }
  
  async submitRating(newRating, previousRating) {
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    this.setLoading(true);
    
    try {
      const response = await window.apiClient.submitRating(
        this.foodId,
        newRating,
        this.state.getState('browserId'),
        this.state.getState('currentDate')
      );
      
      if (response.status === 'success') {
        // Update state
        const userRatings = { ...this.state.getState('userRatings') };
        if (newRating === 0) {
          delete userRatings[this.foodId];
        } else {
          userRatings[this.foodId] = newRating;
        }
        
        this.state.setState({ userRatings });
        
        // Dispatch event
        this.dispatchCustomEvent(EVENTS.RATING_CHANGED, {
          foodId: this.foodId,
          rating: newRating,
          previousRating
        });
        
        // Update component state
        this.userRating = newRating;
        
      } else {
        throw new Error('Rating submission failed');
      }
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      
      // Revert UI to previous state
      this.updateStarDisplay(previousRating);
      
      // Show error
      this.showError(error.message || 'Failed to submit rating');
      
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }
  
  subscribeToState() {
    // Subscribe to user ratings changes
    this.subscriptions.push(
      this.state.subscribe('userRatings', (userRatings) => {
        if (this.foodId && userRatings[this.foodId] !== undefined) {
          this.userRating = userRatings[this.foodId];
          if (this.isInteractive) {
            this.updateStarDisplay(this.userRating);
          }
        }
      })
    );
    
    // Subscribe to ratings data changes
    this.subscriptions.push(
      this.state.subscribe('ratings', (ratings) => {
        if (this.foodId && ratings[this.foodId]) {
          this.communityRating = ratings[this.foodId].average;
          this.communityCount = ratings[this.foodId].count;
          this.render();
        }
      })
    );
  }
  
  afterRender() {
    this.updateFromAttributes();
    this.attachEventListeners();
  }
}

// Register the custom element
customElements.define('star-rating', StarRating);

export default StarRating;
