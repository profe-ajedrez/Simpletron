
module.exports = (function() {
    'use strict';

    const _settings = {
        validFiles : ['mp4', 'mov', 'webm', '3gp', 'avi',  'mpg']
    };


    function _isValid(f) {
      return _settings.validFiles.indexOf((f.name.split('.').pop().toLowerCase())) > -1;
    }

    function _onFileSelected(e, callback) {
        const _u = e.target;

        if (!!_u && !!_u.files && _u.files.length === 1) {          
          if (_isValid(_u.files[0])) {  
            callback(_u.files[0]);
            _u.value = null;
          } else {
              alert('Ese no parece una archivo de video');
          }
        }
    }

    const Control = {
        onFileSelected : _onFileSelected
    };

    return Control;
})();