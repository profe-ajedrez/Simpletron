class TextShrinker extends HTMLElement {
    constructor() {
        super();       
    }

    connectedCallback() {
        
      this.updateText();
    }


    updateText() {
      let text   = this.getAttribute('data-text');
      const _root = this, _parent = _root.parentNode,
            _w = _root.clientWidth, _h = _root.clientHeight,
            _pw = _parent.clientWidth;
      

      if (!text) text = '';
      if (!length) length = text.length;

      let _size = 0;
      if (_w == 0) {
        _size = _pw / (length * 1/3) + 'px!important';
      } else {
        _size = _w / (length * 1/3) + 'px!important';
      }
      this.fontSize  = _size;      
      this.innerHTML = text;
    }

    attributeChangedCallback() {
      this.updateText();
    }


    onStartStop() {

    }

    onReset() {
        
    }

}

customElements.define('text-shrinker', TextShrinker);
