"use strict";


"use strict";
import "core-js/stable";
import "./../style/visual.less";
import 'regenerator-runtime/runtime'
// import "types-registry";
// import "@babel/plugin-transform-runtime";
// import "@babel/polyfill";

import * as d3 from "d3";
import * as $ from "jquery";
import * as _ from "lodash";
import powerbi from "powerbi-visuals-api";

// Import the module:
import * as ACData from "adaptivecards-templating";

// import the module
import * as AdaptiveCards from "adaptivecards";
import * as ACFabric from "adaptivecards-fabric";

import DataView = powerbi.DataView;
import DataViewObjects = powerbi.DataViewObjects;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import PrimitiveValue = powerbi.PrimitiveValue;
import IViewport = powerbi.IViewport;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import DataViewValueColumnGroup = powerbi.DataViewValueColumnGroup;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisual = powerbi.extensibility.visual.IVisual;
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import IColorPalette = powerbi.extensibility.IColorPalette;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import { axis as AxisHelper, axisInterfaces, dataLabelUtils, dataLabelInterfaces } from "powerbi-visuals-utils-chartutils";
import IAxisProperties = axisInterfaces.IAxisProperties;
import IDataLabelInfo = dataLabelInterfaces.IDataLabelInfo;
import LabelEnabledDataPoint = dataLabelInterfaces.LabelEnabledDataPoint;

import * as formattingutils from "powerbi-visuals-utils-formattingutils";
import { valueFormatter as vf, textMeasurementService as tms} from "powerbi-visuals-utils-formattingutils";
import valueFormatter = formattingutils.valueFormatter;
import IValueFormatter = vf.IValueFormatter;
import textMeasurementService = tms;

import * as SVGUtil from "powerbi-visuals-utils-svgutils";
import ClassAndSelector = SVGUtil.CssConstants.ClassAndSelector;
import createClassAndSelector = SVGUtil.CssConstants.createClassAndSelector;
import IRect = SVGUtil.IRect;
import shapes = SVGUtil.shapes;
import IMargin = SVGUtil.IMargin;

import { valueType as vt, pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

import { TooltipEventArgs, ITooltipServiceWrapper, createTooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

import { interactivityBaseService as interactivityService, interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import appendClearCatcher = interactivityService.appendClearCatcher;
import IInteractiveBehavior = interactivityService.IInteractiveBehavior;
import IInteractivityService = interactivityService.IInteractivityService;
import createInteractivitySelectionService = interactivitySelectionService.createInteractivitySelectionService;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import BaseDataPoint = interactivityService.BaseDataPoint;
import IBehaviorOptions = interactivityService.IBehaviorOptions;

import { behavior } from "./behavior";
import { update } from "powerbi-visuals-utils-chartutils/lib/legend/legendData";
import { data } from "jquery";
import { sample } from "lodash";
type Selection = d3.Selection<any, any, any, any>;

interface Payload {
    assign: string, task: string, taskdescription: string,
    startdate: string, duedate: string, categoryid: string, username: string
}

export interface SelectionIdOption extends LabelEnabledDataPoint, SelectableDataPoint {
    identity: ISelectionId;
    index?: number;
    depth?: number;
    values?: string;
    series?: string;
    category?: string;
    selected: boolean;
}

export class SettingState {
    isUrlData: boolean = true;
    sampleJSONData: boolean = false;
    templateUrl: string = "https://";
    targetUrl: string = "https://";
    choiceName: string = "Detail";
    cardWidth: number = 400;
    padding: number = 10;
    margin: number = 10;
    borderShow: boolean = true;
    categoryShow: boolean = true;
    categoryFontSize: number = 26;
    categoryFontColor: string = "#000000";
    categoryFontFamily: string = "Arial";
    categoryFontWeight: string = "Bold";
    borderColor: string = "#000000";
    borderSize: number = 1;
    theme: number = 0;
}

export class Visual implements IVisual {

    private bigDiv: Selection;
    private cardDiv: Selection;
    private settings: SettingState;
    private previousUpdateData;
    private selectionManager: ISelectionManager;
    private host;
    private selectionIdOptions: SelectionIdOption[];
    private Behavior: behavior;
    private interactivityService: IInteractivityService<BaseDataPoint>;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private sandBoxWidth;
    private sandBoxHeight;
    private events: IVisualEventService;
    private clipSelection: Selection ;
    private divSelection: Selection ;
    private pEditor: Selection ;
    private sEditor: Selection ;
    private element;
    private templateJSON;
    private dateFields;
    private jvalueName;
    private chvalueName;
    private svalueName;
    private sampleData;
    public static scrollWidth = 20;
    private adaptiveCard;
    private inputChanged;
    private categoryName;
    private categoryId;
    private prevData = [];
    private prevTemplateUrl = "https://";
    private formatterValuesArr = [];
    private formatterValuesJArr = [];
    public static categoryJSON = "{}";
    private templateHTML = "";

    private syncSelectionState(
        selection: Selection ,
        selectionIds
    ): void {
        if (!selection || !selectionIds) {
            return;
        }

        if (!selectionIds.length) {
            this.divSelection.style("opacity", 1);
            return;
        }

        const self: this = this;
        selection.each(function(d) {
            const isSelected: boolean = self.isSelectionIdInArray(selectionIds, d.identity);
            let opacity = isSelected ? 1 : 0.5;
            d3.select(this).style("opacity", opacity);
        });
    }

    private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
        if (!selectionIds || !selectionId) {
            return false;
        }

        return selectionIds.some((currentSelectionId: ISelectionId) => {
            return currentSelectionId.includes(selectionId);
        });
    }

    public renderCard(card) {

        // Create an AdaptiveCard instance
        let adaptiveCard = new AdaptiveCards.AdaptiveCard();

        // Use Fabric controls when rendering Adaptive Cards
        // ACFabric.useFabricComponents();

        // Set its hostConfig property unless you want to use the default Host Config
        // Host Config defines the style and behavior of a card
        adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
            fontFamily: "Segoe UI, Helvetica Neue, sans-serif"
            // More host config options
        });

        // Set the adaptive card's event handlers. onExecuteAction is invoked
        // whenever an action is clicked in the card
        // adaptiveCard.onExecuteAction = function(action) { alert("Ow!"); }

        // For markdown support you need a third-party library
        // E.g., to use markdown-it, include in your HTML page:
        //     <script type="text/javascript" src="https://unpkg.com/markdown-it/dist/markdown-it.js"></script>
        // And add this code to replace the default markdown handler:
        //     AdaptiveCards.processMarkdown = function(text) { return markdownit().render(text); }

        // Parse the card payload
        adaptiveCard.parse(JSON.parse(card));

        return adaptiveCard.render();
    }

    public renderCard1(templateJSON, dataFields) {
        
        let json = JSON.parse(templateJSON);
        // Create a Template instance from the template payload
        let template = new ACData.Template(json);
        
        // Create a data binding context, and set its $root property to the
        // data object to bind the template to
        let sampleData = dataFields, that = this;
        if (this.settings.sampleJSONData && sampleData !== null) sampleData = JSON.parse(dataFields);
        let context: ACData.IEvaluationContext = { $root : sampleData };
        
        // "Expand" the template - this generates the final Adaptive Card,
        // ready to render
        let card = template.expand(context);
        
        // Render the card
        let adaptiveCard = new AdaptiveCards.AdaptiveCard();
        // Use Fabric controls when rendering Adaptive Cards
        // ACFabric.useFabricComponents();
        adaptiveCard.parse(card);
        adaptiveCard.onExecuteAction = (action) => { 
            let data = action["_processedData"];
            if (that.categoryName) {
                data[that.categoryName] = that.categoryId;
            }
            if (!that.inputChanged) that.submitFunction(JSON.stringify(data));
            that.inputChanged = false; 
        }
        this.adaptiveCard = adaptiveCard;
        return adaptiveCard.render();
    }

    private functionAlert(msg) {
        let confirmBox = $("#confirm");
        confirmBox.find(".message").text(msg);
        confirmBox.focus();
        confirmBox.find(".yes").unbind().click(() => {
           confirmBox.hide();
        });
        // confirmBox.find(".yes").click();
        confirmBox.show();
     }

     public static stopFlag = false;

     public submitFunction(data) {
        let that = this;
        $(".loading").show();
        fetch(this.settings.targetUrl, {

            method: "POST",
            body: data,
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(async (response) => {
                if (response.status >= 400 && response.status < 600) {
                    const text = await response.text();
                    that.functionAlert("Failed!");
                }
                else {
                    const text = await response.text();
                    that.functionAlert("Task Submitted");
                }
                $(".loading").hide();

            })
            .catch((error) => {
                $(".loading").hide();
                that.functionAlert("Failed!");
            });
     }

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.templateJSON = {};
        this.dateFields = {};

        let element = options.element;
        this.element = element;
        let sandBoxWidth = $('#sandbox-host').width(), sandBoxHeight = $('#sandbox-host').height();
        $('#sandbox-host').css("overflow", "auto");
        this.sandBoxWidth = sandBoxWidth;
        this.sandBoxHeight = sandBoxHeight;
        this.bigDiv = d3.select(options.element).append("div").classed("bigDiv", true);
        let that = this;
        let modal = this.bigDiv.append("div").attr("id", "confirm").classed("modal", true);
        let modalContent = modal.append("div").classed("modal-content", true);
        modalContent.append("spacn").classed("yes", true).classed("close", true).text("×");
        modalContent.append("p").classed("message", true).classed("modal-content", true).text("Some text in the Modal..");
        let loading = this.bigDiv.append("div").classed("loading", true).text("Loading&#8230;");
        // this.bigDiv.append("input").attr("type", "button").attr("value", "Submit Target with SampleData").classed("submitBtn", true).on("click", function(){that.submitFunction(that.sampleData[0]);});
        this.cardDiv = this.bigDiv.append("div").attr("class", "cardDiv");
        this.selectionManager = options.host.createSelectionManager();
        this.host = options.host;
        this.Behavior = new behavior();
        this.interactivityService = createInteractivitySelectionService(this.host);
        this.selectionManager.registerOnSelectCallback(() => {
            this.syncSelectionState(that.divSelection, this.selectionManager.getSelectionIds());
        });
        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            this.host.tooltipService,
            options.element);
    }

    public removeAllCalss() {
        $(".bigDiv").removeClass("theme1");
        $(".bigDiv").removeClass("theme2");
        $(".bigDiv").removeClass("theme3");
        $(".bigDiv").removeClass("theme4");
        $(".bigDiv").removeClass("theme5");
        $(".bigDiv").removeClass("theme6");
    }

    private drawHtml(sandboxWidth, sandboxHeight, data) {
        let maxWidth, that = this, theme = this.settings.theme;
        this.cardDiv.selectAll("*").remove(); 
        this.bigDiv.style('overflow', 'auto');
        this.bigDiv.style('width', sandboxWidth + "px").style('height', sandboxHeight + "px");
        this.drawCard(data, sandboxWidth);
        let input = this.cardDiv.selectAll("input, select"), button = this.cardDiv.select("button");
        that.inputChanged = false;
        this.removeAllCalss();
        if (theme !== 0) $(".bigDiv").addClass("theme" + theme);
        this.setIdenityIntoDiv();
        // this.setBehavior(this.divSelection);
        // input.on("change", function(){
        //     that.inputChanged = true;
        //     button.dispatch("click");
        // });
    }

    private drawCard(data, sandboxWidth) {
        let childWidth = this.settings.cardWidth;
        for (let j = 0; j < data.length; j++) {
            let category = data[j].category;
            let div = this.cardDiv.append("div").classed("childDiv", true).classed("div_" + j, true).style("padding", this.settings.padding + "px").style("margin", this.settings.margin + "px").style("width", childWidth + "px").attr("category", category);
            if (this.settings.categoryShow) {
                div.append("h1").text(category).style("font-size", this.settings.categoryFontSize + "px").style("color", this.settings.categoryFontColor).style("font-family", this.settings.categoryFontFamily).style("font-weight", this.settings.categoryFontWeight);
            }
            if (this.settings.borderShow) {
                div.style("border", this.settings.borderSize + "px solid" + this.settings.borderColor);
            }
            let html;
            // if (data[j].svalue !== null) html = this.renderCard1(data[j].cvalue, data[j].svalue);
            // else html = this.renderCard(data[j].cvalue);
            if (data[j].svalue !== null) html = this.renderCard1(this.templateHTML, data[j].svalue);
            else html = this.renderCard(this.templateHTML);
            div.node().append(html);
        }
    }

    private setSettings(objects) {
        this.setSetting(objects, this.settings, 1, "renderGroup", "isUrlData", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "sampleJSONData", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "templateUrl", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "choiceName", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "targetUrl", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "cardWidth", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "borderShow", 0);
        this.setSetting(objects, this.settings, 2, "renderGroup", "borderColor", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "borderSize", 0);
        this.setSetting(objects, this.settings, 1, "renderGroup", "theme", 0);
        this.setSetting(objects, this.settings, 1, "categorySettings", "categoryShow", 0);
        this.setSetting(objects, this.settings, 1, "categorySettings", "categoryFontFamily", 0);
        this.setSetting(objects, this.settings, 1, "categorySettings", "categoryFontWeight", 0);
        this.setSetting(objects, this.settings, 1, "categorySettings", "categoryFontSize", 0);
        this.setSetting(objects, this.settings, 2, "categorySettings", "categoryFontColor", 0);
    }

    private getContextMenu(svg, selection) {
        svg.on('contextmenu', () => {
            const mouseEvent: MouseEvent = (<MouseEvent>d3.event);
            let dataPoint = d3.select(d3.event["currentTarget"]).datum();
            selection.showContextMenu(dataPoint? dataPoint["identity"] : {}, {
                x: mouseEvent.clientX,
                y: mouseEvent.clientY
            });
            mouseEvent.preventDefault();
        }); 
    }

    private setBehavior(clipSelection) {
        let clearCatcher = d3.select('#sandbox-host');
        let that = this;
        clipSelection.on('click', (d) => {
            // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
            if (that.host.allowInteractions) {
                const isCrtlPressed: boolean = (<MouseEvent>d3.event).ctrlKey;
                that.selectionManager
                    .select(d.identity, isCrtlPressed)
                    .then((ids: ISelectionId[]) => {
                        that.syncSelectionState(clipSelection, ids);
                    });

                ( < Event > d3.event).stopPropagation();
            }
        });

        clearCatcher.on('click', (d) => {
            if (that.host.allowInteractions) {
                that.selectionManager
                    .clear()
                    .then(() => {
                        that.syncSelectionState(clipSelection, []);
                    });
            }
        });
    }

    public static ISDATE(str) {
        let a = str.toString().split("T");
        let dt = a[0].split("-");
        if (dt.length !== 3 || isNaN(dt[0]) || isNaN(dt[1]) || isNaN(dt[2])) return false;
        let time = a[1].split(":");
        if (time.length !== 3 || isNaN(time[0]) || isNaN(time[1])) return false;
        let l = time[2].split(".");
        if (l.length < 2 || isNaN(l[0])) return false;
        let last = l[1];
        if (last[last.length - 1] !== 'Z') return false;
        return true;
    }

    public static GETSTRING(val) {
        let str;
        let dt = new Date(val);
        if (val && dt.toString() !== "Invalid Date" && dt.getFullYear() > 1800 && (Visual.ISDATE(val))) {
            str = dt;
        } else {
            str = val;
        }
        return str;
    }

    private setSelectedIdOptions(categorical, dataView) {
        let identity: ISelectionId = null, dataValues = [];
        if(categorical.values) dataValues = categorical.values;
        this.selectionIdOptions = [];
        let formatter: IValueFormatter, formatterCategory: IValueFormatter, columnsf = dataView.metadata.columns, seriesFlag = false;
        for (let i = 0; i < columnsf.length; i++) {
            if (columnsf[i].roles["category"]) {
                formatterCategory = valueFormatter.create({
                    format: valueFormatter.getFormatStringByColumn(
                        columnsf[i],
                        true),
                });
            }
        }
        if (categorical.categories) {
            let j = 0;
            for(let dataValue of dataValues) {
                let values = dataValue.values;
                for(let i = 0, len = dataValue.values.length; i < len; i++) {
                    let selectionId = this.host.createSelectionIdBuilder().withCategory(categorical.categories[0], i).withMeasure(dataValue.source.queryName).withSeries(categorical.values, dataValue).createSelectionId();
                    this.selectionIdOptions.push({
                        category: formatterCategory.format(Visual.GETSTRING(categorical.categories[0].values[i])),
                        identity: selectionId,
                        values: dataValue.source.displayName,
                        selected: false
                    });
                }
                j++;
            }
        } else {
            for (let i = 0; i < dataValues.length; i++) {
                identity = this.host.createSelectionIdBuilder().withMeasure(dataValues[i].source.queryName).createSelectionId();
                this.selectionIdOptions.push({
                    identity: identity,
                    category: dataValues[i].source.displayName,
                    selected: false
                });
            }
        }
    }

    public getValue(val, formatter) {
        let dt = new Date(val);
        if (!isNaN(val)) return Number(val);
        else if (val && dt.toString() !== "Invalid Date" && dt.getFullYear() > 1800 && (Visual.ISDATE(val))) return this.getISOString(dt);
        else return formatter.format(Visual.GETSTRING(val));   
    }

    public IsJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    public getData(categories, jvalueArr, svalueArr, chvalueArr, groupedCnt) {
        let data = [];
        this.sampleData = [];
        let svalue = {};
        
        if (svalueArr.length > 0) {
            if (!this.settings.sampleJSONData) {
                for (let j = 0; j < svalueArr.length; j++) {
                    let val = svalueArr[j][0], name = this.svalueName[j].toString();
                    svalue[name] = this.getValue(val, this.formatterValuesArr[j]);
                }
                for (let j = 0; j < jvalueArr.length; j++) {
                    let val = jvalueArr[j][0], name = this.jvalueName[j].toString(), str = val.toString();
                    if (this.IsJsonString(str)) {
                        svalue[name] = JSON.parse(str);
                    }
                }
                if (chvalueArr.length > 0) {
                    let ch = [];
                    for (let i = 0; i < groupedCnt; i++) {
                        let js = {};
                        for (let j = 0; j < chvalueArr.length; j++) {
                            let val = chvalueArr[j][i], name = this.chvalueName[j].toString(), str = val.toString();
                            js[name] = str;
                        }
                        ch.push(js);
                    }
                    svalue[this.settings.choiceName] = ch;
                }
            } else svalue = svalueArr[0][0];
        }
        this.sampleData.push(svalue);
        data.push({category: categories[0], cvalue: {}, svalue: svalue});
        return data;
    }

    public getISOString(dt) {
        let val = dt.toISOString();
        if (dt.getHours() === 0 && dt.getMinutes() === 0 && dt.getSeconds() === 0) val = val.substr(0, val.length - 5) + "Z";
        return val;
    }

    public getFormatter(dataView) {
        let fcolumns = dataView.metadata.columns;
        let formatterValuesArr = [], formatterValuesArra = [], valuesDisplayName = [];
        let formatterValuesJArr = [], formatterValuesJArra = [], valuesCDisplayName = [];
        let valueNames = [], valueSources = dataView.categorical.values;
        for (let i = 0; i < valueSources.length; i++) {
            valueNames.push(valueSources[i].source.displayName);
        }
        for (let i = 0; i < fcolumns.length; i++) {
             if (fcolumns[i].roles["svalue"]) {
                let formatter = valueFormatter.create({
                    format: valueFormatter.getFormatStringByColumn(
                        dataView.metadata.columns[i],
                        true),
                });
                formatterValuesArr.push(formatter);
                formatterValuesArra.push(formatter);
                let displayName = fcolumns[i].displayName,
                    j;
                for (j = 0; j < valuesDisplayName.length; j++) {
                    if (displayName === valuesDisplayName[j]) break;
                }
                valuesDisplayName.push(displayName);
            } else if (fcolumns[i].roles["jvalue"]) {
                let formatter = valueFormatter.create({
                    format: valueFormatter.getFormatStringByColumn(
                        dataView.metadata.columns[i],
                        true),
                });
                formatterValuesJArr.push(formatter);
                formatterValuesJArra.push(formatter);
                let displayName = fcolumns[i].displayName,
                    j;
                for (j = 0; j < valuesCDisplayName.length; j++) {
                    if (displayName === valuesCDisplayName[j]) break;
                }
                valuesCDisplayName.push(displayName);
            }
        }
        for (let i = 0; i < valuesDisplayName.length; i++) {
            let j;
            for (j = 0; j < valueNames.length; j++) {
                if (valuesDisplayName[i] === valueNames[j]) {
                    break;
                }
            }
            let tmp = formatterValuesArr[j];
            formatterValuesArr[j] = formatterValuesArra[i];
            formatterValuesArra[i] = tmp;
        }
        let len = valuesDisplayName.length;
        for (let i = 0; i < valuesCDisplayName.length; i++) {
            let j;
            for (j = len; j < valueNames.length; j++) {
                if (valuesCDisplayName[i] == valueNames[j]) {
                    break;
                }
            }
            let tmp = formatterValuesJArra[i];
            formatterValuesJArr[i] = formatterValuesJArra[j - len];
            formatterValuesJArra[j - len] = tmp;
        }

        this.formatterValuesArr = formatterValuesArr;
        this.formatterValuesJArr = formatterValuesJArr;
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);

        // this.createLandingPage(options);
        // assert dataView
        if (!options.dataViews || !options.dataViews[0]) { return; }

        let dataViews = options.dataViews, categorical = dataViews[0].categorical, values = [], that = this;
        if (categorical.values) values = categorical.values;
        let objects = dataViews[0].metadata.objects;
        this.settings = new SettingState();
        this.setSettings(objects);
        
        let columns = dataViews[0].metadata.columns, sandboxWidth = $('#sandbox-host').width(), sandboxHeight = $('#sandbox-host').height();
        let svalueArr = [], categories = [], jvalueArr = [], chvalueArr = [];
        this.setSelectedIdOptions(categorical, dataViews[0]);
        let innerValueCount = 0;
        this.jvalueName = [], this.svalueName = [], this.chvalueName = [];
        this.templateHTML = "";
        for (let i = 0; i < values.length; i++) {
            if (values[i].source.roles["svalue"]) {
                let displayName = values[i].source.displayName.toString();
                if (displayName.indexOf("First ") == 0) displayName = displayName.slice(6);
                this.svalueName.push(displayName);
                let tmp = [];
                for (let j = 0; j < values[i].values.length; j++) { 
                    tmp.push(values[i].values[j]);
                }
                svalueArr.push(tmp);
            } else if (values[i].source.roles["jvalue"]) {
                let displayName = values[i].source.displayName.toString();
                if (displayName.indexOf("First ") == 0) displayName = displayName.slice(6);
                this.jvalueName.push(displayName);
                let tmp = [];
                for (let j = 0; j < values[i].values.length; j++) { 
                    tmp.push(values[i].values[j]);
                }
                jvalueArr.push(tmp);
            } else if (values[i].source.roles["cvalue"]) {
                for (let j = 0; j < values[i].values.length; j++) { 
                    this.templateHTML = values[i].values[j];
                }
            } else if (values[i].source.roles["chvalue"]) {
                let displayName = values[i].source.displayName.toString();
                if (displayName.indexOf("First ") == 0) displayName = displayName.slice(6);
                this.chvalueName.push(displayName);
                let tmp = [];
                for (let j = 0; j < values[i].values.length; j++) { 
                    tmp.push(values[i].values[j]);
                }
                chvalueArr.push(tmp);
            }
        }
        // if (this.templateHTML === "") return;
        this.categoryName = null;
        this.getFormatter(dataViews[0]);
        if (categorical.categories) categories = categorical.categories[0].values, this.categoryName = categorical.categories[0].source.displayName, this.categoryId = categorical.categories[0].values[0];
        else categories = this.jvalueName;
        let groupedCnt = 0;
        for (let i = 0; i < categories.length; i++) {
            if (categories[i] !== categories[0]) break;
            groupedCnt ++;
        }
        let data = this.getData(categories, jvalueArr, svalueArr, chvalueArr, groupedCnt);
        // if (that.prevTemplateUrl !== that.settings.templateUrl || Visual.categoryJSON !== JSON.stringify(options.dataViews[0].categorical)) {
        //     // using XMLHttpRequest
        //     let xhr = new XMLHttpRequest();
        //     xhr.open("GET", this.settings.templateUrl, true);
        //     xhr.onload = function () {
        //         for (let i = 0; i < data.length; i++) data[i].cvalue = xhr.responseText, that.templateJSON = xhr.responseText;
        //         that.drawHtml(sandboxWidth, sandboxHeight, data);
        //         that.prevTemplateUrl = that.settings.templateUrl;
        //         that.prevData = data;
        //         Visual.categoryJSON = JSON.stringify(options.dataViews[0].categorical);
        //     };
        //     xhr.onerror = function () {
        //         that.cardDiv.append("text").text("Document not loaded, check Url");
        //     }
        //     xhr.send();
        // } else {
        //     this.drawHtml(sandboxWidth, sandboxHeight, that.prevData);
        // }
        this.drawHtml(sandboxWidth, sandboxHeight, data);
        this.tooltipServiceWrapper.addTooltip(this.divSelection, (tooltipEvent: TooltipEventArgs < SelectionIdOption > ) => this.getTooltipData(tooltipEvent)
            , (tooltipEvent: TooltipEventArgs < SelectionIdOption > ) => null);
        this.events.renderingFinished(options);
    }
    
    private getSelectionData(selectionIdOptions, clipSelection) {
        let labelData = [];
        clipSelection.each(() => {
            labelData.push(selectionIdOptions[0]);
        });
        return labelData;
    }

    private setIdenityIntoDiv() {
        let selectionIdOptions = this.selectionIdOptions;
        // this.clipSelection = d3.selectAll(".childDiv").selectAll("*");
        this.divSelection = d3.selectAll(".childDiv");
        // this.clipSelection.data(this.getSelectionData(selectionIdOptions, this.clipSelection));
        this.divSelection.data(this.getSelectionData(selectionIdOptions, this.divSelection));
        d3.selectAll(".bigDiv").data(selectionIdOptions);
        // this.getContextMenu(this.divSelection, this.selectionManager);
        this.getContextMenu(this.bigDiv, this.selectionManager);
    }

    private getTooltipData(value: any): VisualTooltipDataItem[] {
        let sel = d3.select(value.context);
        while (sel.attr("class") === null || sel.attr("class").search('childDiv') < 0) {
            sel = d3.select(sel.node().parentNode);
        }
        let category = sel.attr("category");
        let valueName = sel.attr("value");
        let result = [];
        if (category) result.push({displayName: "Category", value: category});
        if (valueName) result.push({displayName: "Value", value: valueName});
        return result;
    }

    private setSetting(objects: DataViewObjects, settings: SettingState,
        mode: number, objectName: string, propertyName: string, index: number) {
        if (objects === undefined) return;
        let object = objects[objectName];
        if (object !== undefined) {
            let property = object[propertyName];
            if (property !== undefined) {

                switch (mode) {
                    case 1:
                        settings[propertyName] = property;
                        break;
                    case 2:
                        let subProp1 = property["solid"];
                        if (subProp1 !== undefined) {
                            let subProp2 = subProp1["color"];
                            if (subProp2 !== undefined) {
                                settings[propertyName] = subProp2;
                            }
                        }
                        break;
                    case 5:
                        if (property < 0) settings[propertyName] = 0;
                        else settings[propertyName] = property;
                        break;
                    case 6:
                        if (property > 0) settings[propertyName] = 0;
                        else settings[propertyName] = property;
                        break;
                }
            }
        }
    }

    private enumerateRenderGroup() {
        let internalInstances: VisualObjectInstance[] = [];
        if (this.settings.isUrlData) {    
            internalInstances.push( < VisualObjectInstance > {
                objectName: "renderGroup",
                selector: null,
                properties: {
                    // templateUrl: this.settings.templateUrl,
                }
            });
        }
        internalInstances.push( < VisualObjectInstance > {
            objectName: "renderGroup",
            selector: null,
            properties: {
                choiceName: this.settings.choiceName,
                targetUrl: this.settings.targetUrl,
                cardWidth: this.settings.cardWidth,
                theme: this.settings.theme,
                margin: this.settings.margin,
                padding: this.settings.padding,
                borderShow: this.settings.borderShow
            }
        });
        if (this.settings.borderShow) {
            internalInstances.push( < VisualObjectInstance > {
                objectName: "renderGroup",
                selector: null,
                properties: {
                    borderColor: this.settings.borderColor,
                    borderSize: this.settings.borderSize
                }
            });
        }
        return internalInstances;
    }

    private enumerateCategorySettings() {
        let internalInstances: VisualObjectInstance[] = [];
        internalInstances.push( < VisualObjectInstance > {
            objectName: "categorySettings",
            selector: null,
            properties: {
                categoryShow: this.settings.categoryShow
            }
        });
        if (this.settings.categoryShow) {
            internalInstances.push( < VisualObjectInstance > {
                objectName: "categorySettings",
                selector: null,
                properties: {
                    categoryFontFamily: this.settings.categoryFontFamily,
                    categoryFontSize: this.settings.categoryFontSize,
                    categoryFontColor: this.settings.categoryFontColor,
                    categoryFontWeight: this.settings.categoryFontWeight
                }
            });
        }
        return internalInstances;
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {

        let internalInstances: VisualObjectInstance[] = [];
        switch (options.objectName) {
            case "renderGroup":
                return this.enumerateRenderGroup();
            case "categorySettings":
                return this.enumerateCategorySettings();
        }
        return internalInstances;
    }
}