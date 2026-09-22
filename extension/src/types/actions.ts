export type ActionType = 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'NAVIGATE';

export interface BaseAction {
  type: ActionType;
}

export interface ClickAction extends BaseAction {
  type: 'CLICK';
  target: string;
}

export interface TypeAction extends BaseAction {
  type: 'TYPE';
  target: string;
  value: string;
}

export interface SelectAction extends BaseAction {
  type: 'SELECT';
  target: string;
  value: string;
}

export interface ScrollAction extends BaseAction {
  type: 'SCROLL';
  direction: 'up' | 'down';
  amount?: number;
}

export interface NavigateAction extends BaseAction {
  type: 'NAVIGATE';
  url: string;
}

export type BrowserAction = ClickAction | TypeAction | SelectAction | ScrollAction | NavigateAction;

export interface ActionResult {
  success: boolean;
  action: BrowserAction;
  error?: string;
  details?: any;
}
