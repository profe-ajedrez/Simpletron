const { v4: uuidv4 } = require('uuid');
const { spawn }      = require("child_process");
const pathToFfmpeg   = require('ffmpeg-static');
const { trueCasePath, trueCasePathSync } = require('true-case-path')

module.exports = (function() {
    'use strict';

    let _duration = '';
    let _jobList = [];

    const _presets  = ['auto', 'youtube', 'classroomtv'];
    const _settings = {
        auto        : "%input% %output%",
        youtube     : "%input%  %output%",
        classroomtv : "-c:v libx265 -crf 20 -preset faster -c:a copy"
    };

    const _statuses = {
      WAITING  : 0,
      WORKING  : 1,
      STARTING : 2,
      DONE     : 3  
    };

    function _formatBytes(a,b=2){if(0===a)return"0 Bytes";const c=0>b?0:b,d=Math.floor(Math.log(a)/Math.log(1024));return parseFloat((a/Math.pow(1024,d)).toFixed(c))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}

    function _unserializeData(data, line) {
        const filtro = ['frame', 'fps', 'q', 'size', 'time', 'bitrate', 'speed'];
        const d = data.toString().split(/[\s\=]/).filter(function(e,i) { return e.replace(/\s+/g, '') !== ''; } );

        if (_jobList[line].duration === null) {
          const __d = /Duration:\s{1}[0-9\:\.]+/.exec(data.toString());
          if (Array.isArray(__d)) {
            _duration = __d[0].replace(/Duration\:\s+/, '').split(':').map(function(e, i) { return parseFloat(e.replace(/\s+/g, ''))});
            _duration = _duration[0] * 3600 + _duration[1] * 60 + _duration[2];
            _jobList[line].duration = _duration;
          }
        }
        const _d = {};
        if (d[0] === 'frame') {
            _d.frame = d[1];
        }
        if (d[2] === 'fps') {
            _d.fps = d[3];
        }
        if (d[4] === 'q') {
            _d.q = d[5];
        }
        if (d[6] === 'size') {
            _d.size = d[7];
        }
        if (d[8] === 'time') {
            _d.time = d[9];
        }
        if (d[10] === 'bitrate') {
            _d.bitrate = d[11];
        }
        if (d[12] === 'speed') {
            _d.speed = d[13];
        }
        return _d;
    }

    function onChangePreset(e) {
        const line = e.target.id.replace(/[^0-9]/g, '');
        if (line >= 0 && line < _jobList.length) {
            const p = e.target.options[e.target.selectedIndex].value;
            if (_presets.indexOf(p.toLowerCase()) > -1) {
                _jobList[line].preset = p;
            }
        }

    }

    function _getButton(line) {
       return `
       <div id='form-container-${line}' class='form-container'>
       <form class="pure-form form-${line} onsubmit='return false;'">
           <span class='inlineblock '>         
            <div class="select">
                <select name="preset-${line}" id="preset-${line}" class='preset'>
                    <option value='auto'>Auto</option>
                    <option value='classroomtv'>ClassroomTV</option>
                    <option value='youtube'>Youtube</option>
                </select>
            </div>
           </span>
           <button type='button' id='iniciar-${line}' class='pure-button pure-button-primary iniciar'>Iniciar</button>         
       </form>
       </div>
       `; 
    }


    function _getBar(line) {
       return `
       <div id='barmark-${line}' class='barmark hidden'>
         <div id='bar-${line}' class='bar'>
         </div>
       </div>
       `; 
    }

    function _getJobUI(line, file) {
        const size   = _formatBytes(file.size);
        const button = _getButton(line);
        const name   = file.name.substring(0, 16) + (file.name.length > 16 ? '...' : '');
        const divider= (line > 0 ? 'divider' : '');
        const barr   = _getBar(line);
        return `          
      <div id='jobList-${line}' class='joblist ${divider}'>
        <div class='pure-g'>
          <div class='w33 l-box'>
            <div id = 'control-${line}' class=''>
              <table>                
                <tbody>
                  <tr><th>Archivo</th><td><span>${name}</span></td></tr>
                  <tr><th>Tama&nacute;o</th><td><span>${size}</span></td></tr>
                </tbody>
              </table>  
            </div>
            
          </div>
          <div class='w33 l-box'>
            ${button}
            ${barr}
          </div>          
        </div>
      </div>
      
        `;
    }

    function _getNewJob(name) {
        const _newJobTemplate = {
        id              : uuidv4().replace(/\-/, ''),  
        start_timestamp : null,
        end_timestamp   : null,
        duration        : null,
        filename        : name,
        status          : _statuses.WAITING,
        preset          : 'auto'   
        };
        return _newJobTemplate;
    }


    function _addJob(file, container) {
      _jobList.push(_getNewJob(file.path));
      container.append(_getJobUI(_jobList.length -1, file));
    }

    function _removeJob(line, remover, onRemove) {
      remover(line);
      _jobList.splice(line, 1);
      if (typeof onRemove === 'function') {
        onRemove();  
      }
    }


    function _onprogress(data, line) {
     //frame= 1466 fps=158 q=-0.0 size=    1536kB time=00:00:49.11 bitrate= 256.2kbits/s speed=5.31x 
       const d = _unserializeData(data, line);
       if (d.hasOwnProperty('frame') && _jobList[line].duration !== null) {
         const bar_id     = $('bar-' + line);
         const percent = (parseFloat(d.time) * 100 / _jobList[line].duration).toFixed(2);
         bar_id[0].style.width = percent + '%';
       }
    }


    function _startJob(line, onStart) {
        const n =  "\\\"" + trueCasePathSync(_jobList[line].filename) + "\\\"";        
        let params =  ['-i', _jobList[line].filename, '-c:v', 'libx265', '-crf', '20', '-preset', 'faster', '-c:a', 'copy', _jobList[line].id + '.mp4'];
        _jobList[line].start_timestamp = (new Date).getTime();
        _jobList[line].status = _statuses.WORKING;

        const control_id = $('#control-' + line);
        const bar_id     = $('barmark-' + line);

        

        control_id.hide(300);
        bar_id.show(300);
        bar_id.removeClass('hidden').addClass('visible');

        const ls = spawn(pathToFfmpeg, params);

        ls.stdout.on("data", data => {

        console.log(`stdout: ${data}`);
        });

        ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
        _onprogress(data, line);
        });

        ls.on('error', (error) => {
        console.log(`error: ${error.message}`);
        });

        ls.on("close", code => {
        console.log(`child process exited with code ${code}`);
        });
        
    }


    function _stopJob(line, onDone) {

    }


    const JobHandler = {
        jobList   : _jobList,
        addJob    : _addJob,
        removeJob : _removeJob,
        startJob  : _startJob,
        stopJob   : _stopJob,
        onChangePreset : onChangePreset
    };

    return JobHandler;
})();

