////////////////////////////////////////////////////////////////////////////////
//
// The MIT License (MIT)
// Copyright (c) 2015 Jake Knerr <jake@ardisialabs.com>
//
////////////////////////////////////////////////////////////////////////////////

/**
 * Draws columnar guidelines at a specified column. Originally used as a print
 * margin, but is now used for code legibility.
 *
 * Will only work properly if code is displayed using a fixed-width font.
 *
 * @author Jake Knerr <jake@ardisialabs.com>
 * @copyright Jake Knerr
 * @license MIT
 * @version 1.0.1
 */
define(function (require, exports, module) {

  "use strict";

  //---------------------------------------------------
  //
  //  Dependencies
  //
  //---------------------------------------------------

  //----------------------------------
  //  brackets
  //----------------------------------

  var CommandManager = brackets.getModule("command/CommandManager");
  var Dialogs = brackets.getModule("widgets/Dialogs");
  var EditorManager = brackets.getModule("editor/EditorManager");
  var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  var MainViewManager = brackets.getModule("view/MainViewManager");
  var Menus = brackets.getModule("command/Menus");
  var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
  var Strings = brackets.getModule("strings");
  var WorkspaceManager = brackets.getModule("view/WorkspaceManager");

  //---------------------------------------------------
  //
  //  Constants
  //
  //---------------------------------------------------

  //----------------------------------
  //  private
  //----------------------------------

  /**
   * The global command ID for the menu: author, extensions, action.
   * @private
   * @const
   * @type {String}
   */
  var GUIDELINES_ID = "jakeknerr.guidelines.open_preferences";

  /**
   * Default preferences for the extension.
   * @private
   * @enum {Number|String|Boolean}
   */
  var DEFAULT_PREFERENCES = {
    columns: 80,
    columnColor: '#B0B4B9',
    enabled: true
  };

  //---------------------------------------------------
  //
  //  Variables
  //
  //---------------------------------------------------

  //----------------------------------
  //  private
  //----------------------------------

  /**
   * Reference to the view menu.
   * @private
   * @type {Menu}
   */
  var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);

  /**
   * Store the string used to set the width of the guideline.
   * @private
   * @type {String}
   */
  var guideLineChars;

  /**
   * Store whether the extension has been disabled by the user.
   * @private
   * @type {Boolean}
   */
  var enabledExt;

  /**
   * Store the user selected color for the guideline in hex format.
   * @private
   * @type {String}
   */
  var guidelineColor;

  //---------------------------------------------------
  //
  //  Methods
  //
  //---------------------------------------------------

  //----------------------------------
  //  public
  //----------------------------------

  /**
   * Creates the guidelines.
   * @public
   */
  function createGuidelines() {
    // defer will fix some timing issues with animations
    setTimeout(function() {

      // initially I thought I could add the guideline to each pane alone and
      // not editor instances, however this doesn't work because then the
      // guideline does not scroll; must add to each editor instance; one
      // downside is that the guidelines is considered to be in the scroller
      // calculation so if the viewport is smaller than the guideline, it will
      // show scrollbars

      if (!enabledExt) {
        return;
      }

      // loop through each pane; get the height of each pane so that
      // the guideline can be sized to at least fill the viewport
      var panes = $("div.pane-content");
      panes.each(function() {
        var pane = $(this);
        var minHeight = pane.height();

        // add the guideline to the sizer; this will also add guidelines to
        // inline editors
        var sizers = pane.find("div.CodeMirror-sizer");
        sizers.each(function() {
          var jSizer = $(this);

          // reuse guidelines if possible
          var guideline = jSizer.find("div.guideline");
          if (!guideline || guideline.length < 1) {
            // add the guideline; notice that you must wrap the code in <pre>
            // because when line numbers are disabled, brackets introduces a
            // style .show-line-padding that will indent <pre> tags based on
            // the theme;
            jSizer.append(
            '<div class="guideline" tabindex="-1">' +
              '<pre class>' +
                '<span>' +
                  guideLineChars +
                '</span>' +
              '</pre>' +
            '</div>');
            guideline = jSizer.find(" > .guideline");
          }
          guideline.css('border-right-color', guidelineColor);

          // set the minimum height to the viewport height
          guideline.css("min-height", minHeight + "px");

        });
      });
    }, 0);
  }

  //----------------------------------
  //  private
  //----------------------------------

  /**
   * Updates guideline layout.
   */
  function layout() {

  }

  /**
   * Shows the preferences dialog and saves any changes.
   * @private
   */
  function showPrefDialog() {

    // handles form events
    function formHandler(event) {

      switch (event.type) {

        case 'keyup':
          if (event.keyCode === 27) {
            closeDialog();
          }

          break;

        case 'click':
          var btnId = $(event.currentTarget).attr("data-button-id");
          if (btnId === "cancel") {
            closeDialog();
          } else {
            // check if error alert already exists and remove
            var errorAlert = jqDialog.find('.alert');
            errorAlert.remove();

            var errors = [];

            // chrome native form validation can handle this form
            if (!colsInput[0].checkValidity()) {
              errors.push("Enter a column number value between 1 - 1000.");
            }
            if (!colorInput[0].checkValidity()) {
              errors.push("Enter a valid hex color. E.G. #B0B4B9");
            }

            // if errors
            if (errors.length > 0) {
              var fieldContainer = jqDialog.find('.field-container');
              var errorString = "<div class='alert'>";
              errors.forEach(function(msg) {
                errorString += "<div>* " + msg + "</div>";
              });
              errorString += "</div>";
              fieldContainer.append(errorString);

              return;
            }

            PreferencesManager.set("guidelines.columns", colsInput.val());
            PreferencesManager.set("guidelines.columnColor", colorInput.val());
            PreferencesManager.set("guidelines.enabled",
              enabledInput[0].checked);

            // update settings
            guideLineChars = getGuidelineString();
            enabledExt = PreferencesManager.get("guidelines.enabled");
            guidelineColor = PreferencesManager.get("guidelines.columnColor");

            // update
            // clear out guidelines for refresh
            $("div.guideline").remove();
            createGuidelines();
            closeDialog();
          }

          break;

      }
    }

    /**
     * Handles closing the dialog and cleanup.
     * @private
     */
    function closeDialog() {
      dialog.close();

      cancelBtn.off('click', formHandler);
      okBtn.off('click', formHandler);
      $(document).off('keyup', formHandler);
    }

    // load template on-demand to save memory
    var prefTpl = require("text!templates/preferences.html");
    var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(prefTpl,
      Strings), false);

    var jqDialog = dialog.getElement();
    var colsInput = jqDialog.find('#columns-num');
    var colorInput = jqDialog.find('#column-color');
    var enabledInput = jqDialog.find('#guidelines-enabled');
    var okBtn = jqDialog.find("a[data-button-id='ok']");
    var cancelBtn = jqDialog.find("a[data-button-id='cancel']");

    // handle closing manually to handle validation
    cancelBtn.on('click', formHandler);
    okBtn.on('click', formHandler);
    $(document).on('keyup', formHandler);

    colsInput.val(PreferencesManager.get("guidelines.columns"));
    colorInput.val(PreferencesManager.get("guidelines.columnColor"));
    enabledInput[0].checked = PreferencesManager.get("guidelines.enabled");
  }

  /**
   * Returns the string used to set the width of the guideline.
   * @private
   * @returns {String}
   */
  function getGuidelineString() {
    var columns = PreferencesManager.get("guidelines.columns");
    columns = !columns || null ? 80 : columns < 1 ? 80 : columns;
    var chars = "";
    for (var i = 0; i < columns; i++) {
      chars += "-";
    }
    return chars;
  }

  //---------------------------------------------------
  //
  //  Event handlers
  //
  //---------------------------------------------------

  /**
   * Handles events for the extension.
   * @private
   * @param event {Event} - the Event that triggered the handler
   */
  function eventHandler(event) {
    console.log(event.type)
    switch (event.type) {

      case "activeEditorChange":
      case "change":
      case "workingSetMove":
      case "paneLayoutChange":
      case "change":
      case "workspaceUpdateLayout":
        createGuidelines();

        break;

    }

  }

  //---------------------------------------------------
  //
  //  Initialization
  //
  //---------------------------------------------------

  // setup the preferences and defaults
  PreferencesManager.definePreference("guidelines.columns", "number",
    DEFAULT_PREFERENCES.columns);
  PreferencesManager.definePreference("guidelines.columnColor", "number",
    DEFAULT_PREFERENCES.columnColor);
  PreferencesManager.definePreference("guidelines.enabled", "boolean",
    DEFAULT_PREFERENCES.enabled);

  // load custom css
  ExtensionUtils.loadStyleSheet(module, "css/main.css");

  // setup the string used to set the guideline width
  guideLineChars = getGuidelineString();

  // get some settings now to prevent constant lookup
  enabledExt = PreferencesManager.get("guidelines.enabled");
  guidelineColor = PreferencesManager.get("guidelines.columnColor");

  // fires for inline editor creation;
  EditorManager.on('activeEditorChange', eventHandler);

  // theme changes, font changes, folding, line-numbers; should catch settings
  // that change the gutter width
  PreferencesManager.on("change", eventHandler);

  // fires when panes are created; works even when the pane isn't focused;
  // will not fire for inline editors; will add the guideline when a pane
  // is created but not focused; the primary pane will not dispatch this event
  // when it is created;
  // MainViewManager.on('paneCreate', eventHandler);

  // handles the situation when a file is moved to a new pane but not focused
  MainViewManager.on('workingSetMove', eventHandler);

  // catches layout when pane orientation changes; layout event doesn't fire for
  // this oddly
  MainViewManager.on("paneLayoutChange", eventHandler);

  // doesn't fire for inline editor, new files, or as the scrollable content
  // changes, orientation changes; surprisingly not that useful; however,
  // will catch resizes that make the guideline extend out of the viewable
  // region and trigger scrolling
  WorkspaceManager.on("workspaceUpdateLayout", eventHandler);

  // add preferences dialog launcher to the menu
  CommandManager.register("Guidelines", GUIDELINES_ID, showPrefDialog);
  menu.addMenuDivider();
  menu.addMenuItem(GUIDELINES_ID);

});
