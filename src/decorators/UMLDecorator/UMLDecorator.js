/*globals define, _*/
/*jshint browser: true, camelcase: false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Decorators/DecoratorBase',
    './DiagramDesigner/UMLDecorator.DiagramDesignerWidget',
    './PartBrowser/UMLDecorator.PartBrowserWidget'
], function (DecoratorBase, UMLDecoratorDiagramDesignerWidget, UMLDecoratorPartBrowserWidget) {

    'use strict';

    var UMLDecorator,
        DECORATOR_ID = 'UMLDecorator';

    UMLDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        DecoratorBase.apply(this, [opts]);

        this.logger.debug('UMLDecorator ctor');
    };

    _.extend(UMLDecorator.prototype, DecoratorBase.prototype);
    UMLDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    UMLDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            DiagramDesigner: UMLDecoratorDiagramDesignerWidget,
            PartBrowser: UMLDecoratorPartBrowserWidget
        };
    };

    return UMLDecorator;
});