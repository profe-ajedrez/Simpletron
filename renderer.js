const $ = require('jquery')  // jQuery now loaded and assigned to $
var M   = require('materialize-css/dist/js/materialize.min.js');
const { spawn }      = require("child_process");
const pathToFfmpeg   = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');
var remote = require('electron').remote;
var shell = remote.shell;

if (window.module) module = window.module;

const _statuses = {
    WAITING  : 0,
    WORKING  : 1,
    STARTING : 2,
    DONE     : 3,
    IDLE     : 4,
    ERROR    : 5,
    LOADING  : 6,
    ENDED    : 7
  };



const _jobList = [];

function _formatBytes(a,b=2){if(0===a)return"0 Bytes";const c=0>b?0:b,d=Math.floor(Math.log(a)/Math.log(1024));return parseFloat((a/Math.pow(1024,d)).toFixed(c))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}


function _newJobTemplate(line, filename, size) {
    const uuid = uuidv4();
    const output = filename.replace(filename.split('.').pop(), '') + uuid + '.mp4';
    return {
        line : line,
        id       : uuid,
        filename : filename,
        size     : size,
        status   : _statuses.IDLE,
        successed: false,
        duration : -1,
        secondsProcessed : -1,
        starttime : 0,
        endtime   : 0,
        ellapsedtime: 0,
        outputfilename : output,
        bar  : null
    };
}



function _getButton(line) { return document.getElementById(`btn-start-${line}`); }
function _getSpinner(line) { return document.getElementById(`progress-cont-${line}`); }
function _getBar(line) { return document.getElementById(`progress-${line}`); }
function _getEta(line) { return document.getElementById(`faltante-${line}`); }
function _getLog(line) { return document.getElementById(`seebtn-cont-${line}`); }




function _unserializeData(data, line) {
    const filtro = ['frame', 'fps', 'q', 'size', 'time', 'bitrate', 'speed'];
    const d = data.toString().split(/[\s\=]/).filter(function(e,i) { return e.replace(/\s+/g, '') !== ''; } );

    if (_jobList[line].duration === -1) {
      const __d = /Duration:\s{1}[0-9\:\.]+/.exec(data.toString());
      if (Array.isArray(__d)) {
        _duration = __d[0].replace(/Duration\:\s+/, '').split(':').map(function(e, i) { return parseFloat(e.replace(/\s+/g, ''))});
        _duration = _duration[0] * 3600 + _duration[1] * 60 + _duration[2];
        if (!isNaN(_duration)) {
            _jobList[line].duration = _duration;
        }
      }
    }
    const _d = {frame : null, fps : null, q : null, size : null, time : null, bitrate : null, speed : null};
    if (Array.isArray(d)) {
        if (d.length > 1 && d[0] === 'frame') {
            _d.frame = d[1];
        }
        if (d.length > 3 && d[2] === 'fps') {
            _d.fps = d[3];
        }
        if (d.length > 5 && d[4] === 'q') {
            _d.q = d[5];
        }
        if (d.length > 7 && d[6] === 'size') {
            _d.size = d[7];
        }
        if (d.length > 9 && d[8] === 'time') {
            _d.time = d[9].replace(/[^0-9\.\:]/g, '').split(':');
            _d.time = parseFloat(_d.time[0]) * 3600 + parseFloat(_d.time[1]) * 60 + parseFloat(_d.time[2]);
            _d.time = (isNaN(_d.time) ? 0 : _d.time);
        }
        if (d.length > 11 && d[10] === 'bitrate') {
            _d.bitrate = d[11];
        }
        if (d.length > 13 && d[12] === 'speed') {
            _d.speed = d[13];
        }
    }
    return _d;
}



function _getJobUi(line, filename, filesize) {
    const divider = (line > 0 ? '<div class="divider grey-text lighten-3" style="margin-bottom : 0.7em;margin-top:0.7em;"></div>' : '');
    return `
${divider}    
<div id='shadow-vjob-root line-${line}' style='display:hidden'>
    <div class='row'>
        <div class='col m6'>
            <div class='grey-text lighten-3'>               
                <div>${filename}</div>
                <div>${filesize}</div>
                <div id='faltante-${line}'></div>               
            </div>
        </div>
        <div class='col m6'>
            <div>
                <button id='btn-start-${line}' type='button'
                    class='startbtn waves-effect waves-light ondemand_video blue darken-3 white-text btn-small' style=' margin-top:2em;'>
                    <i id='btnicon-${line}' class='material-icons left'>play_circle_filled</i>Iniciar</button>
                <div id='progress-cont-${line}' class='progress  blue lighten-2' style='display:none; margin-top:3em; width:100%; height:6px'>
                    <div id='progress-${line}' class="determinate blue darken-2" style="width: 0% height;6px"></div>
                </div>
                <div id='seebtn-cont-${line}' class='see-btn-cont' style='display:none'></div>              
            </div>
        </div>
    </div>
</div>
    `;
}


function _registerJob(line) {
    let params =  ['-i', _jobList[line].filename, '-n', '-c:v', 'libx265', '-crf', '18', '-preset', 'veryfast', '-c:a', 'copy', _jobList[line].outputfilename];
    _jobList[line].starttime = (new Date).getTime();

    const spinn    = _getSpinner(line);
    $(spinn).show(300);


    const ls = spawn(pathToFfmpeg, params);
    const _rg = /encoded\s[0-9]+ frame/;
    const checkOneLiner = (l, d) => {
        const _o = _rg.exec(d.toString());
        if (Array.isArray(_o) && _o.length >= 1) {
           _changeStatusJob(l, _statuses.DONE);
        }
    };

    ls.stdout.on("data", data => {
        //console.log(`stdout: ${data}`);
        checkOneLiner(line, data);
    });

    ls.stderr.on("data", data => {
        //console.log(`stderr: ${data}`);
        _onworking(line, _unserializeData(data, line));
        checkOneLiner(line, data);
    });

    ls.on('error', (error) => {
        //console.log(`error: ${error.message}`);
        _changeStatusJob(line, _statuses.ERROR);
    });

    ls.on("close", code => {
        //console.log(`child process exited with code ${code}`);
        if (code == 0) {
            _changeStatusJob(line, _statuses.DONE);
        } else {
            _changeStatusJob(line, _statuses.ERROR);
        }
    });
}


function _onworking(line, data) {
    const progress = _getBar(line);
    const _w = parseFloat(data.time * 100 / parseFloat(_jobList[line].duration));
    if (!isNaN(_w) && isFinite(_w)) {
      progress.style.width = _w.toFixed(2) + '%';      
    }
    _jobList[line].ellapsedtime = (new Date()).getTime() - _jobList[line].starttime; 


    const eta = _getEta(line);
    let eta_ = ((_jobList[line].ellapsedtime * 100 / _w) - _jobList[line].ellapsedtime) /1000;
    
    if (isNaN(eta_) || !isFinite(eta_)) {
        eta_ = 'ETA Calculando...';
    } else {
        eta_ = 'Eta ' + Math.floor(eta_ / 3600) + ':' + Math.floor(Math.max(0, Math.min(((eta_ % 3600) / 60), 59))) + ':' +
                 Math.round(Math.max(0, Math.min(59, ((eta_ % 3600) % 60)))).toFixed(2);
    }             
    $(eta).text(eta_);
}


function _addJob(file, container) {
    _jobList.push(_newJobTemplate(_jobList.length -1, file.path, file.size));
    $(container).append(_getJobUi(_jobList.length -1, file.name, _formatBytes(file.size)));
    $('shadow-vjob-root line-' + _jobList.length - 1).show(200);
}


function _onstart(line) {
   const btn      = _getButton(line);
   const spinn    = _getSpinner(line);

   $(btn).hide();
   btn.disable = true;

   _registerJob(line);
  _jobList[line].status = _statuses.WORKING;
}


function _onadd(file) {
    const cont = document.getElementById('appendableJobs');
    _addJob(file, cont);
}


function _ondone(line) {
    if (_jobList[line].status == _statuses.DONE) {   
        const bar = _getSpinner(line);
        const log = _getLog(line);
        $(bar).hide(100, function(){ bar.innerHTML = '';});            

        const eta = _getEta(line);
        $(eta).hide(300);    

        $(log).append(`
        <button id = 'ver-${line}' type='button' class='verbtn waves-effect waves-light ondemand_video blue white-text btn-small'  style=' margin-top:2em;>Ver archivo</button>
        `);
        $(log).show(300);   
        _jobList[line].status == _statuses.ENDED;
    }
}


function _changeStatusJob(line, status) {
    if (!!line || line == 0) {
        _jobList[line].status = status;
        onStatusChange(line);
    }
}

function _onerror(line) {
    const btn = _getButton(line);

    if ($(btn).is(':hidden')) {
        const bar = _getSpinner(line);
        const spinner = _getSpinner(line);
        $(bar).hide(100);
        spinner.insertAdjacentHTML('beforeend', '<span class="red-text">No se pudo codificar el archivo</span>');
    }
}

function onStatusChange(line) {
    line = parseInt(line);
    if (!isNaN(line) && _jobList.length > line && line >= 0) {
        switch(_jobList[line].status) {
            case _statuses.STARTING:
                _onstart(line);
                break;
            case _statuses.DONE:
                _ondone(line);
                break;
            case _statuses.WAITING:
                _onwaiting(line);
                break;
            case _statuses.IDLE:
                _onidle(line);
                break;
            case _statuses.ERROR:
                _onerror(line);
                break;            
        }
    }
}



$('body').on('click', '.startbtn', function(e) {
    if (!!e.target) {
        const line = e.target.id.replace(/[^0-9]/g, '');
        _changeStatusJob(line, _statuses.STARTING);
    }
});



$('body').on('click', '.verbtn', function(e) {
    if (!!e.target) {
        const line = e.target.id.replace(/[^0-9]/g, '');
        if (_jobList[line].status === _statuses.DONE) {
            shell.showItemInFolder(_jobList[line].outputfilename);
        }
    }
});




$('#fileselector').on('change', function(e) {
    if ($('#fileselector').val()) {
        _onadd(e.target.files[0]);
        //_changeStatusJob(e.target.files[0], _statuses.STARTING);
    }
});
