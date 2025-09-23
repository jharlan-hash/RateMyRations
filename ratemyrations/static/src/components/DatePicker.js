/**
 * DatePicker Component
 * Handles date selection with validation and formatting
 */
import BaseComponent from './BaseComponent.js';
import { formatDate } from '../utils/helpers.js';

class DatePicker extends BaseComponent {
  constructor() {
    super();
    this.currentDate = new Date().toISOString().split('T')[0];
    this.minDate = null;
    this.maxDate = null;
  }
  
  static get observedAttributes() {
    return ['value', 'min', 'max', 'placeholder'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
      this.render();
    }
  }
  
  updateFromAttributes() {
    this.currentDate = this.getAttributeValue('value', new Date().toISOString().split('T')[0]);
    this.minDate = this.getAttributeValue('min');
    this.maxDate = this.getAttributeValue('max');
  }
  
  getTemplate() {
    const formattedDate = formatDate(this.currentDate);
    
    return `
      <div class="date-picker-container">
        <label for="date-input" class="date-picker-label">Select Date</label>
        <div class="date-picker-wrapper">
          <input 
            type="date" 
            id="date-input" 
            class="date-picker-input"
            value="${this.currentDate}"
            ${this.minDate ? `min="${this.minDate}"` : ''}
            ${this.maxDate ? `max="${this.maxDate}"` : ''}
          />
          <div class="date-picker-display">${formattedDate}</div>
          <div class="date-picker-navigation">
            <button type="button" class="date-nav-btn prev" aria-label="Previous day">‹</button>
            <button type="button" class="date-nav-btn today" aria-label="Today">Today</button>
            <button type="button" class="date-nav-btn next" aria-label="Next day">›</button>
          </div>
        </div>
      </div>
    `;
  }
  
  attachEventListeners() {
    const dateInput = this.querySelector('#date-input');
    const prevBtn = this.querySelector('.date-nav-btn.prev');
    const todayBtn = this.querySelector('.date-nav-btn.today');
    const nextBtn = this.querySelector('.date-nav-btn.next');
    
    if (dateInput) {
      dateInput.addEventListener('change', this.handleDateChange.bind(this));
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.navigateDate(-1));
    }
    
    if (todayBtn) {
      todayBtn.addEventListener('click', () => this.goToToday());
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.navigateDate(1));
    }
  }
  
  handleDateChange(event) {
    const newDate = event.target.value;
    if (this.isValidDate(newDate)) {
      this.setDate(newDate);
    }
  }
  
  navigateDate(direction) {
    const current = new Date(this.currentDate);
    current.setDate(current.getDate() + direction);
    
    const newDate = current.toISOString().split('T')[0];
    if (this.isValidDate(newDate)) {
      this.setDate(newDate);
    }
  }
  
  goToToday() {
    const today = new Date().toISOString().split('T')[0];
    this.setDate(today);
  }
  
  setDate(dateString) {
    if (this.currentDate === dateString) return;
    
    this.currentDate = dateString;
    this.setAttribute('value', dateString);
    
    // Update input value
    const dateInput = this.querySelector('#date-input');
    if (dateInput) {
      dateInput.value = dateString;
    }
    
    // Update display
    this.updateDisplay();
    
    // Dispatch event
    this.dispatchCustomEvent('date-changed', {
      date: dateString,
      formattedDate: formatDate(dateString)
    });
    
    // Update global state
    this.state.setState({ currentDate: dateString });
  }
  
  updateDisplay() {
    const display = this.querySelector('.date-picker-display');
    if (display) {
      display.textContent = formatDate(this.currentDate);
    }
  }
  
  isValidDate(dateString) {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    // Check min/max constraints
    if (this.minDate && dateString < this.minDate) return false;
    if (this.maxDate && dateString > this.maxDate) return false;
    
    return true;
  }
  
  subscribeToState() {
    // Subscribe to global date changes
    this.subscriptions.push(
      this.state.subscribe('currentDate', (date) => {
        if (date !== this.currentDate) {
          this.setDate(date);
        }
      })
    );
  }
  
  afterRender() {
    this.updateFromAttributes();
    this.attachEventListeners();
    this.updateDisplay();
  }
}

// Register the custom element
customElements.define('date-picker', DatePicker);

export default DatePicker;
