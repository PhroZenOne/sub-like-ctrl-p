(function () {
    "use strict";

    /*global localStorage: false, window: false */

    function save_options() {
        localStorage["sublime-like-tabbing-threshold"] = window.document.getElementById("threshold").value;
        localStorage["sublime-like-tabbing-history"] = window.document.getElementById("history").value;
        var status = window.document.getElementById("status");
        status.innerHTML = "Options Saved.";
        window.setTimeout(function () {status.innerHTML = ""; }, 2000);
    }
    function restore_options() {
        var threshold = localStorage["sublime-like-tabbing-threshold"],
            history = localStorage["sublime-like-tabbing-history"];
        if (threshold) {
            window.document.getElementById("threshold").value = threshold;
        } else {
            window.document.getElementById("threshold").value = 0.3; // repeated in tabwindow.js
        }
        if (history) {
            window.document.getElementById("history").value = history;
        } else {
            window.document.getElementById("history").value = 100;  // repeated in tabwindow.js
        }
    }
    window.document.addEventListener('DOMContentLoaded', restore_options);
    window.document.querySelector('#save').addEventListener('click', save_options);
}());