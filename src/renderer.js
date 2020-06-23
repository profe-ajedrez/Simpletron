
const remote = require('electron').remote;
const ipc    = require('electron').ipcRenderer;

const JobHandler = require('./JobHandler');
const Control    = require('./Control');

const jobContainer = $('#boxx');

function newJob(line) {
  JobHandler.addJob(line, jobContainer);
}

$('#upload').on('change', function(e) {
  Control.onFileSelected(e, newJob);
});


$('body').on('click', 'button.iniciar', function(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
  JobHandler.startJob(e.target.id.replace(/[^0-9]/g, ''));
});

$('body').on('change', 'select.preset', function(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
  JobHandler.onChangePreset(e);
});


/*
ipc.on('fileLoadedReply', (e, args) => {
  alert(args);
});
*/