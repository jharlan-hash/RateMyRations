/**
 * Tests for AppState class
 */
import AppState from '../state/AppState.js';
import TestUtils from './TestUtils.js';

describe('AppState', () => {
  let appState;
  let mockLocalStorage;
  
  beforeEach(() => {
    mockLocalStorage = TestUtils.mockLocalStorage();
    appState = new AppState();
  });
  
  afterEach(() => {
    appState.clear();
  });
  
  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const state = appState.getState();
      
      expect(state.menus).toEqual({});
      expect(state.ratings).toEqual({});
      expect(state.userRatings).toEqual({});
      expect(state.currentDate).toBeDefined();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.expandedSections).toBeInstanceOf(Set);
      expect(state.browserId).toBeDefined();
      expect(state.adminMode).toBe(false);
    });
    
    test('should create unique browser ID', () => {
      const browserId1 = appState.getState('browserId');
      appState.clear();
      const browserId2 = appState.getState('browserId');
      
      expect(browserId1).toBeDefined();
      expect(browserId2).toBeDefined();
      expect(browserId1).not.toBe(browserId2);
    });
    
    test('should load state from localStorage', () => {
      const testData = { userRatings: { 1: 4, 2: 3 } };
      mockLocalStorage['userRatings'] = JSON.stringify(testData.userRatings);
      
      const newAppState = new AppState();
      expect(newAppState.getState('userRatings')).toEqual(testData.userRatings);
    });
  });
  
  describe('State Management', () => {
    test('should update state and notify listeners', () => {
      const listener = jest.fn();
      appState.subscribe('menus', listener);
      
      const newMenus = { 'Burge': { 'breakfast': [] } };
      appState.setState({ menus: newMenus });
      
      expect(appState.getState('menus')).toEqual(newMenus);
      expect(listener).toHaveBeenCalledWith(newMenus, {});
    });
    
    test('should not notify listeners for unchanged values', () => {
      const listener = jest.fn();
      appState.subscribe('menus', listener);
      
      const menus = { 'Burge': { 'breakfast': [] } };
      appState.setState({ menus });
      appState.setState({ menus }); // Same value
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
    
    test('should unsubscribe listeners', () => {
      const listener = jest.fn();
      const unsubscribe = appState.subscribe('menus', listener);
      
      appState.setState({ menus: { 'Burge': {} } });
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      appState.setState({ menus: { 'Catlett': {} } });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });
    
    test('should get specific state value', () => {
      appState.setState({ menus: { 'Burge': {} } });
      
      expect(appState.getState('menus')).toEqual({ 'Burge': {} });
      expect(appState.getState('ratings')).toEqual({});
    });
  });
  
  describe('Persistence', () => {
    test('should save state to localStorage', () => {
      const userRatings = { 1: 4, 2: 3 };
      appState.setState({ userRatings });
      
      expect(mockLocalStorage['userRatings']).toBe(JSON.stringify(userRatings));
    });
    
    test('should handle localStorage errors gracefully', () => {
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not throw
      expect(() => {
        appState.setState({ userRatings: { 1: 4 } });
      }).not.toThrow();
      
      mockLocalStorage.setItem = originalSetItem;
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid JSON in localStorage', () => {
      mockLocalStorage['userRatings'] = 'invalid json';
      
      // Should not throw
      expect(() => {
        new AppState();
      }).not.toThrow();
    });
  });
});

export default {};
