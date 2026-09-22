import { BoundingBox, M3DOMInputContract } from '../types/privacy';

/**
 * Normalizes an M3 DOM_RESPONSE (flat element array) into M2's expected format.
 * Maps 'target' -> 'selector' and 'bounds' -> 'bbox'.
 * Safely handles missing/partial fields and never fabricates hierarchy.
 */
export function normalizeM3DOMResponse(
  m3Response: any,
  sessionId: string = 'unknown_session',
  url: string = 'unknown_url',
  title: string = 'unknown_title'
): M3DOMInputContract {
  if (!m3Response || !Array.isArray(m3Response.elements)) {
    return {
      sessionId,
      url,
      title,
      interactableElements: []
    };
  }

  const interactableElements = m3Response.elements.map((el: any) => {
    let bbox: BoundingBox | undefined = undefined;
    if (el.bounds && typeof el.bounds.x === 'number') {
      bbox = {
        x: el.bounds.x,
        y: el.bounds.y,
        width: el.bounds.width,
        height: el.bounds.height
      };
    }

    return {
      id: el.id || el.target || 'unknown',
      selector: el.target || '',
      type: el.inputType || el.type || el.tagName || 'unknown',
      label: el.label || el.placeholder || el.name || '',
      value: el.value !== undefined ? el.value : (el.text || ''),
      bbox
    };
  });

  return {
    sessionId,
    url,
    title,
    interactableElements,
    // rawDomTree is explicitly omitted (optional) because M3 provides a flat list.
  };
}

/**
 * Converts M2's M3DOMInputContract interactableElements into the format expected by PIIDetector.detectInDOMElement
 */
export function mapInteractableElementsToDetectorInput(
  elements: M3DOMInputContract['interactableElements']
): Array<{
  tag: string;
  attributes: Record<string, string>;
  text?: string;
  selector: string;
  bbox?: BoundingBox;
}> {
  return elements.map(el => {
    const attributes: Record<string, string> = {};
    if (el.type) attributes['type'] = el.type;
    if (el.label) attributes['aria-label'] = el.label;
    if (el.value) attributes['value'] = el.value;
    if (el.id) attributes['id'] = el.id;

    return {
      tag: el.type.toLowerCase(),
      attributes,
      text: el.value, // Treat value as inner text/value for PII detector
      selector: el.selector,
      bbox: el.bbox
    };
  });
}
