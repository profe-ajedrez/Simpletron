class Test extends HTMLElement {
    constructor() {
        super();       
    }

    connectedCallback() {
        const ownerDocument = document.currentScript.ownerDocument;
        const template = ownerDocument.querySelector('#test-template');
        const instance = template.content.cloneNode(true);

        let shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(instance);

        this.content = shadowRoot.querySelector("#testroot p");       
    }

    onStartStop() {

    }

    onReset() {
        
    }

    showTime(time) {

    }

}

customElements.define('test-', Test);
