(function () {
  'use strict';
   
   /* global localStorage: false, $: false, chrome: false, Fuse: false */

   /* http://dzone.com/snippets/validate-url-regexp */
  function isUrl(s) {
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    return regexp.test(s);
  }

  $(window).load(function(){
    if (location.search != '?focusHack')location.search = '?focusHack';
    var $this = $('body'),
    data = {
      elem: {
        inputField: $('#searchFilter', $this).focus(),
        searchResults: $('#searchResults', $this)
      },
      rows: [],
      linkNoRepeat: []
    },
    fuse;
    
    /* Gather data from tabs */
     chrome.tabs.query({currentWindow: true}, function(tabs){
      $.each(tabs, function(index, tab){
        
        var $elem = $('<li />').html(tab.title + ' <br /> <span class="info">' + tab.url + '</span>').addClass('tab').click(function(){
          chrome.tabs.update(tab.id, {active: true});
        });
        
        data.elem.searchResults.append($elem);

        data.rows.push({
          title: tab.title,
          url: tab.url,
          id: tab.id,
          elem: $elem
        });

        data.linkNoRepeat.push(tab.url);

      });
      updateSearch();
    });

    /* Gather data from bookmarks */
    function process_bookmark(bookmarks, child) {
      $.each(bookmarks, function(index, bookmark){
          if (bookmark.url && $.inArray(bookmark.url, data.linkNoRepeat) == -1) {

            var $elem = $('<li />').html(bookmark.title + ' <br /> <span class="info">' + bookmark.url + '</span>').addClass('bookmark').click(function(){
              chrome.tabs.create({
                url: bookmark.url,
                active: true
              });
            });

            data.rows.push({
              title: bookmark.title,
              url: bookmark.url,
              elem: $elem
            });
            data.elem.searchResults.append($elem);
          }
          if (bookmark.children) {
              process_bookmark(bookmark.children, true);
          }
      });
      if(!child){
        updateSearch();
      }
    }
    chrome.bookmarks.getTree(process_bookmark);


    /* Gather data from history */
    chrome.history.search(
      {
        text: '',
        maxResults: parseInt(localStorage['sublime-like-tabbing-history'], 10) || 100
      },
      function(history){
        $.each(history, function(index, history){
          if($.inArray(history.url, data.linkNoRepeat) == -1){
            var $elem = $('<li />').html(history.title + ' <br /> <span class="info">' + history.url + '</span>').addClass('history').click(function(){
              chrome.tabs.create({
                url: history.url,
                active: true
              });
            });
            data.elem.searchResults.append($elem);
            data.rows.push({
              title: history.title,
              url: history.url,
              id: history.id,
              elem: $elem
            });
          }
          updateSearch();
        });
      }
    );

    function updateSearch(){
      fuse = new Fuse(data.rows, {threshold: parseInt(localStorage['sublime-like-tabbing-threshold'], 10) || 0.3, keys: ['title', 'url']});
    }

    /* Setup the filter function
    TODO: optimization, i.e. do not hide all and then show.
     */
    data.elem.inputField.change(function(){
      var filterString = $(this).val();
      if(!filterString){
        $.each(data.rows, function(index, tab){
          tab.elem.show();
        });
      } else {
        $(data.elem.searchResults).children().hide();
        if(fuse){
          var result = fuse.search(filterString);
          $.each(result, function(index, row){
            row.elem.show();
          });
        }
      }
    }).keyup(function(){
      $(this).change();
    });

    var ARROW_DOWN = 40, ARROW_UP = 38, ENTER = 13, ESCAPE = 27;

    /* register key movement and enter */
    var $liSelected, $allLi;
    $(window).keydown(function(e){

      if(e.which != ARROW_DOWN && e.which != ARROW_UP && e.which != ENTER && e.which != ESCAPE){
        return true;
      }
      
      if(e.which == ENTER){
        if(!$liSelected || $liSelected && $liSelected.is(':hidden')){
          $allLi = $('li:visible', data.elem.searchResults);
          if($allLi.length > 0){
            $allLi.first().click();
          } else {
            /* url check */
            if(isUrl(data.elem.inputField.val())){
              chrome.tabs.create({
                url: data.elem.inputField.val(),
                active: true
              });
            } else {
              chrome.tabs.create({
                url: 'https://www.google.se/search?q=' + data.elem.inputField.val(), // I WANT TO USE OMNIBOX HERE BUT CANT :/ :/ :/
                active: true
              });
            }
          }
        } else {
          $liSelected.click();
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
        $allLi = $('li:visible', data.elem.searchResults);
        if($liSelected && $liSelected.is(':hidden')){
          $liSelected = null;
        }
        var next;
        if(e.which == ARROW_DOWN){
            if($liSelected && $liSelected.next){
                $liSelected.removeClass('selected');
                next = $liSelected.nextAll(':visible');
                if(next.length > 0){
                    $liSelected = next.first().addClass('selected');
                }else{
                    $liSelected = $allLi.first().addClass('selected');
                }
            }else{
                $liSelected = $allLi.first().addClass('selected');
            }
        }else if(e.which == ARROW_UP){
            if($liSelected && $liSelected.prev){
                $liSelected.removeClass('selected');
                next = $liSelected.prevAll(':visible').first();
                if(next.length > 0){
                    $liSelected = next.first().addClass('selected');
                }else{
                    $liSelected = $allLi.last().addClass('selected');
                }
            }else{
                $liSelected = $allLi.last().addClass('selected');
            }
        }
        /* scroll to selected element */

        data.elem.searchResults.scrollTop(data.elem.searchResults.scrollTop() + $liSelected.offset().top - 250);
        if($liSelected && $liSelected.is(':visible') && $liSelected.hasClass('tab')){
          $liSelected.click();
        } else if(!$liSelected || $liSelected && $liSelected.is(':hidden')){
          $liSelected = $allLi.first().addClass('selected');
          if($liSelected.hasClass('tab')){
            $liSelected.click();
          }
        }
      }
      return false;
    });
  });
}());