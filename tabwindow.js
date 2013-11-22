'use strict'

$.fn.scrollTo = function( target, options, callback ){
  if(typeof options == 'function' && arguments.length == 2){ callback = options; options = target; }
  var settings = $.extend({
    scrollTarget  : target,
    offsetTop     : 50,
    duration      : 500,
    easing        : 'swing'
  }, options);
  return this.each(function(){
    var scrollPane = $(this);
    var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : $(settings.scrollTarget);
    var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
    scrollPane.animate({scrollTop : scrollY }, parseInt(settings.duration), settings.easing, function(){
      if (typeof callback == 'function') { callback.call(this); }
    });
  });
}

$(window).load(function(){
  if (location.search != "?focusHack") location.search = "?focusHack";
  var $this = $('body');
  
  var data = {
    elem: {
      inputField: $('#searchFilter', $this).focus(),
      searchResults: $("#searchResults", $this)
    },
    tabs: [],
    bookmarks: [],
    history: []
  },
  tabFuse, bookmarkFuse, historyFuse;
  

  /*
  TODO: cache all data and update async.
  */


  /* Gather data from tabs */
  var tabsDeferred = $.Deferred();
   chrome.tabs.query({currentWindow: true}, function(tabs){
    $.each(tabs, function(index, tab){
      data.tabs.push({
        title: tab.title,
        url: tab.url,
        id: tab.id
      });
    });
    tabsDeferred.resolve();
  });

  /* populate DOM from tabs */
  tabsDeferred.done(function(){
    $.each(data.tabs, function(index, tab){
      tab.elem = $('<li />').html(tab.title + " <br /> " + tab.url).addClass("tab").click(function(){
        /* scroll to selected li */
        chrome.tabs.update(tab.id, {active: true});
      });
      data.elem.searchResults.append(tab.elem);
    });
    updateSearch();
  });


  /* Gather data from bookmarks */
  var bookmarksDeferred = $.Deferred();
  function process_bookmark(bookmarks, child) {
      for (var i =0; i < bookmarks.length; i++) {
          var bookmark = bookmarks[i];
          if (bookmark.url) {
              data.bookmarks.push({
                title: bookmark.title,
                url: bookmark.url
              });
          }
          if (bookmark.children) {
              process_bookmark(bookmark.children, true);
          }
      }
      if(!child){
        bookmarksDeferred.resolve();
      }
  }
  chrome.bookmarks.getTree(process_bookmark);

  /*
  TODO: check if a bookmark url is same as tab url, then remove it
  */

  /* populate DOM from bookmarks */
  bookmarksDeferred.done(function(){
    $.each(data.bookmarks, function(index, bookmark){
      bookmark.elem = $('<li />').text(bookmark.title + " " + bookmark.url).addClass("bookmark").click(function(){
        chrome.tabs.create({
          url: bookmark.url,
          active: true});
      });
      data.elem.searchResults.append(bookmark.elem);
    });
    updateSearch();
  });

/*
 TODO: populate from chrome.history
 */


  /* Gather data from history */
  var historyDeferred = $.Deferred();
  chrome.history.search({text: ""}, function(history){
    $.each(history, function(index, hist){
      data.history.push({
        title: hist.title,
        url: hist.url,
        id: hist.id
      });
    });
    historyDeferred.resolve();
  });

  /*
  TODO: check if a history url is same as tab url, then remove it
  */

  /* populate DOM from history */
  historyDeferred.done(function(){
    $.each(data.history, function(index, history){
      history.elem = $('<li />').text(history.title + " " + history.url).addClass("history").click(function(){
        chrome.tabs.create({
          url: history.url,
          active: true});
      });
      data.elem.searchResults.append(history.elem);
    });
    updateSearch();
  });



  /* Setup the filter function
  TODO: optimization, i.e. do not detach all and repopulate.
   */
  function updateSearch(){
    tabFuse = new Fuse(data.tabs, {threshold: 0.3, keys: ["title", "url"]});
    bookmarkFuse = new Fuse(data.bookmarks, {threshold: 0.3, keys: ["title", "url"]});
    historyFuse = new Fuse(data.history, {threshold: 0.3, keys: ["title", "url"]});

    data.elem.inputField.change(function(){
      var filterString = $(this).val();

      if(!filterString){
        $.each(data.tabs, function(index, tab){
          tab.elem.show();
        });
        $.each(data.bookmarks, function(index, bokmark){
          bokmark.elem.show();
        });
        $.each(data.history, function(index, bokmark){
          bokmark.elem.show();
        });
      } else {
        $(data.elem.searchResults).children().hide();

        var tabResult = tabFuse.search(filterString);
        var bookmarkResult = bookmarkFuse.search(filterString);
        var historyResult = historyFuse.search(filterString);

        $.each(tabResult, function(index, tab){
          tab.elem.show();
        });
        $.each(bookmarkResult, function(index, bokmark){
          bokmark.elem.show();
        });
        $.each(historyResult, function(index, bokmark){
          bokmark.elem.show();
        });
      }
    }).keyup(function(){
      $(this).change();
    });
  }

  var ARROW_DOWN = 40, ARROW_UP = 38, ENTER = 13, ESCAPE = 27;

  /* register key movement and enter */
  var liSelected;
  $(window).keydown(function(e){

    if(e.which != ARROW_DOWN && e.which != ARROW_UP && e.which != ENTER && e.which != ESCAPE){
      return true;
    }
    
    if(e.which == ENTER){
      if(!liSelected || liSelected && liSelected.is(':hidden')){
        var li = $('li:visible', data.elem.searchResults);
        if(li.length > 0){
          li.first().click();
        } else {
          /* url check */
          var isUrl = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(data.elem.inputField.val());
          if(isUrl){
            chrome.tabs.create({
              url: data.elem.inputField.val(),
              active: true
            });
          } else {
            chrome.tabs.create({
              url: 'https://www.google.se/search?q=' + data.elem.inputField.val(),
              active: true
            });
          }
        }
      } else {
        liSelected.click();
      }
      window.close();
      return false;
    }

    if(e.which == ESCAPE){
      window.close();
      return false;
    }

    if(e.which == ARROW_DOWN || e.which == ARROW_UP){
      $('li:hidden', data.elem.searchResults).removeClass('selected');
      var li = $('li:visible', data.elem.searchResults);
      if(liSelected && liSelected.is(':hidden')){
        liSelected = null;
      }
      if(e.which == ARROW_DOWN){
          if(liSelected && liSelected.next){
              liSelected.removeClass('selected');
              var next = liSelected.nextAll(':visible');
              if(next.length > 0){
                  liSelected = next.first().addClass('selected');
              }else{
                  liSelected = li.first().addClass('selected');
              }
          }else{
              liSelected = li.first().addClass('selected');
          }
      }else if(e.which == ARROW_UP){
          if(liSelected && liSelected.prev){
              liSelected.removeClass('selected');
              var next = liSelected.prevAll(':visible').first();
              if(next.length > 0){
                  liSelected = next.first().addClass('selected');
              }else{
                  liSelected = li.last().addClass('selected');
              }
          }else{
              liSelected = li.last().addClass('selected');
          }
      }
      /* scroll to selected element */

      data.elem.searchResults.scrollTop(data.elem.searchResults.scrollTop() + liSelected.offset().top - 250);
      if(liSelected && liSelected.is(':visible') && liSelected.hasClass("tab")){
        liSelected.click();
      } else if(!liSelected || liSelected && liSelected.is(':hidden')){
        liSelected = li.first().addClass('selected');
        if(liSelected.hasClass('tab')){
          liSelected.click();
        }
      }
    }
    return false;
  });

});