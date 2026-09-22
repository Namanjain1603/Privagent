import { BrowserAction, ActionResult } from './actions';

export type MessageType =
  | 'DOM_REQUEST'
  | 'DOM_RESPONSE'
  | 'SCREENSHOT_REQUEST'
  | 'SCREENSHOT_RESPONSE'
  | 'ACTION_REQUEST'
  | 'ACTION_RESULT'
  | 'ERROR'
  | 'CREATE_TAB_REQUEST'
  | 'CREATE_TAB_RESPONSE'
  | 'TAB_STATE_REQUEST'
  | 'TAB_STATE_RESPONSE';

export interface BaseMessage {
  type: MessageType;
}

export interface TabState {
  tabId: number;
  url: string;
  title: string;
  status: string;
  active: boolean;
  supportedPage: boolean;
}

// Extracted DOM Elements representation
export interface ExtractedElement {
  target: string; // Stable ID
  type: string;
  tagName: string;
  inputType?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  ariaLabel?: string;
  options?: string[]; // For select
  disabled: boolean;
  visible: boolean;
  bounds?: { x: number, y: number, width: number, height: number };
}

export interface DOMRequestMessage extends BaseMessage {
  type: 'DOM_REQUEST';
  tabId?: number; // Optional. If not provided, routes to active tab
}

export interface DOMResponseMessage extends BaseMessage {
  type: 'DOM_RESPONSE';
  elements: ExtractedElement[];
}

export interface ScreenshotRequestMessage extends BaseMessage {
  type: 'SCREENSHOT_REQUEST';
  tabId?: number; // Optional. If not provided, routes to active tab
}

export interface ScreenshotResponseMessage extends BaseMessage {
  type: 'SCREENSHOT_RESPONSE';
  dataUrl: string; // base64 image
}

export interface ActionRequestMessage extends BaseMessage {
  type: 'ACTION_REQUEST';
  action: BrowserAction;
  tabId?: number; // Optional. If not provided, routes to active tab
}

export interface ActionResultMessage extends BaseMessage {
  type: 'ACTION_RESULT';
  result: ActionResult;
}

export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  error: string;
}

export interface CreateTabRequestMessage extends BaseMessage {
  type: 'CREATE_TAB_REQUEST';
  url?: string; // Optional starting URL
}

export interface CreateTabResponseMessage extends BaseMessage {
  type: 'CREATE_TAB_RESPONSE';
  tabId: number;
}

export interface TabStateRequestMessage extends BaseMessage {
  type: 'TAB_STATE_REQUEST';
  tabId?: number;
}

export interface TabStateResponseMessage extends BaseMessage {
  type: 'TAB_STATE_RESPONSE';
  tab: TabState; // Current active tab state
}

export type ExtensionMessage =
  | DOMRequestMessage
  | DOMResponseMessage
  | ScreenshotRequestMessage
  | ScreenshotResponseMessage
  | ActionRequestMessage
  | ActionResultMessage
  | ErrorMessage
  | CreateTabRequestMessage
  | CreateTabResponseMessage
  | TabStateRequestMessage
  | TabStateResponseMessage;
