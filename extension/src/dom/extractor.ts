import { ExtractedElement } from '../types/messages';

export class DOMExtractor {
  public extract(): ExtractedElement[] {
    const elements: ExtractedElement[] = [];
    let targetCounter = 0;

    // We only care about interactive or meaningful elements
    const query = 'input, textarea, select, button, a, [role="button"]';
    const nodes = document.querySelectorAll(query);

    nodes.forEach((node) => {
      const el = node as HTMLElement;
      
      // Skip if invisible
      if (!this.isVisible(el)) return;

      const tagName = el.tagName.toLowerCase();
      
      // Generate a stable target ID
      let targetId = el.getAttribute('data-privagent-target');
      if (!targetId) {
        targetId = el.id || el.getAttribute('name') || `target_${targetCounter++}`;
        el.setAttribute('data-privagent-target', targetId);
      }

      const extracted: ExtractedElement = {
        target: targetId,
        type: this.determineType(el, tagName),
        tagName,
        visible: true,
        disabled: (el as HTMLInputElement).disabled || false,
      };

      // Extract specific attributes
      if (el.id) extracted.id = el.id;
      if (el.getAttribute('name')) extracted.name = el.getAttribute('name')!;
      if (el.getAttribute('aria-label')) extracted.ariaLabel = el.getAttribute('aria-label')!;

      // Handle Inputs/Textareas
      if (tagName === 'input' || tagName === 'textarea') {
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
        extracted.inputType = inputEl.type || 'text';
        extracted.placeholder = inputEl.placeholder;
        extracted.label = this.findLabel(inputEl);
      }

      // Handle Selects
      if (tagName === 'select') {
        const selectEl = el as HTMLSelectElement;
        extracted.label = this.findLabel(selectEl);
        extracted.options = Array.from(selectEl.options).map(o => o.value || o.text);
      }

      // Handle Buttons/Links
      if (tagName === 'button' || tagName === 'a' || el.getAttribute('role') === 'button') {
        extracted.text = el.innerText?.trim() || el.textContent?.trim() || '';
      }

      // Get bounds
      const rect = el.getBoundingClientRect();
      extracted.bounds = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };

      elements.push(extracted);
    });

    return elements;
  }

  private isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    return true;
  }

  private determineType(el: HTMLElement, tagName: string): string {
    if (tagName === 'input' || tagName === 'textarea') return 'input';
    if (tagName === 'select') return 'select';
    if (tagName === 'button' || tagName === 'a' || el.getAttribute('role') === 'button') return 'button';
    return 'element';
  }

  private findLabel(el: HTMLElement): string | undefined {
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent?.trim();
    }
    
    // Check if wrapped in label
    const closestLabel = el.closest('label');
    if (closestLabel) {
       // Filter out the element's text itself if needed, but simple textContent works for MVP
       return closestLabel.textContent?.trim();
    }
    
    return undefined;
  }
}
