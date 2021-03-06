sap.ui.define(["sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"./utilities",
	"sap/ui/core/routing/History"
], function(BaseController, MessageBox, Utilities, History) {
	"use strict";

	

	return BaseController.extend("com.sap.build.standard.buildPoleEmploiEpf.controller.Accueil", {
		handleRouteMatched: function(oEvent) {
			var oParams = {};

			if (oEvent.mParameters.data.context) {
				this.sContext = oEvent.mParameters.data.context;
				var oPath;
				if (this.sContext) {
					
					oPath = {
						path: "/" + this.sContext,
						parameters: oParams
					};
					this.getView().bindObject(oPath);
				}
			}
			this.displayOfficeName();
			this.filterCellByOffice();
		},
		displayCells: function (oData){
        	var that = this;
        	var model = new sap.ui.model.json.JSONModel();
        	var list = that.getView().byId("cellList");
        	var cells = [];
        	for(var i = 0; i < oData.length; i++){
        		cells.push({
        			key: oData[i].CELLULE_ID,
        			name: oData[i].CELLULE_NAME,
        			state: oData[i].CELLULE_ETAT
        		});
        	}
        	model.setData({cells: cells});
        	list.setModel(model, "cellsModel");
        	
		},
		filterCellByOffice: function () {
			var that = this;
			$.ajax({
				url: "/datasappe/applisappe/services/"+
				"applisappe.xsodata/Cellule?$filter=CELLULE_BATIMENT_ID eq " + sap.ui.getCore().AppContext.officeId,
				type: "GET",
				success: function(filteredData, status) {
					that.displayCells(filteredData.d.results);
				},
				error: function(resultat, status, error) {
					MessageBox.error("Erreur : "+ error.message);
				}, 
				dataType: "json"
			});
		},
		displayOfficeName: function(){
			var that = this;
			$.ajax({
			url: "/datasappe/applisappe/services/"+
			"applisappe.xsodata/Batiment?$filter=BATIMENT_ID eq " + sap.ui.getCore().AppContext.officeId,
			type: "GET",
			success: function(data, status) {
				that.getView().byId("siteName").setText(data.d.results[0].BATIMENT_NAME);
			},
			error: function(resultat, status, error) {
				MessageBox.error("Erreur : "+ error.message);
			}, 
			dataType: "json"
		});
		},
		_onPageNavButtonPress4: function(oEvent) {

			var oBindingContext = oEvent.getSource().getBindingContext();

			return new Promise(function(fnResolve) {

				this.doNavigate("Regions", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		doNavigate: function(sRouteName, oBindingContext, fnPromiseResolve, sViaRelation) {

			var sPath = (oBindingContext) ? oBindingContext.getPath() : null;
			var oModel = (oBindingContext) ? oBindingContext.getModel() : null;

			var sEntityNameSet;
			if (sPath !== null && sPath !== "") {
				if (sPath.substring(0, 1) === "/") {
					sPath = sPath.substring(1);
				}
				sEntityNameSet = sPath.split("(")[0];
			}
			var sNavigationPropertyName;
			var sMasterContext = this.sMasterContext ? this.sMasterContext : sPath;

			if (sEntityNameSet !== null) {
				sNavigationPropertyName = sViaRelation || this.getOwnerComponent().getNavigationPropertyForNavigationWithContext(sEntityNameSet,
					sRouteName);
			}
			if (sNavigationPropertyName !== null && sNavigationPropertyName !== undefined) {
				if (sNavigationPropertyName === "") {
					this.oRouter.navTo(sRouteName, {
						context: sPath,
						masterContext: sMasterContext
					}, false);
				} else {
					oModel.createBindingContext(sNavigationPropertyName, oBindingContext, null, function(bindingContext) {
						if (bindingContext) {
							sPath = bindingContext.getPath();
							if (sPath.substring(0, 1) === "/") {
								sPath = sPath.substring(1);
							}
						} else {
							sPath = "undefined";
						}

						// If the navigation is a 1-n, sPath would be "undefined" as this is not supported in Build
						if (sPath === "undefined") {
							this.oRouter.navTo(sRouteName);
						} else {
							this.oRouter.navTo(sRouteName, {
								context: sPath,
								masterContext: sMasterContext
							}, false);
						}
					}.bind(this));
				}
			} else {
				this.oRouter.navTo(sRouteName);
			}

			if (typeof fnPromiseResolve === "function") {
				fnPromiseResolve();
			}
		},
		_onListItemPress3: function(oEvent) {
			var cellModel = oEvent.getParameter("listItem").oBindingContexts.cellsModel;
			var selectedIndex = cellModel.sPath.split("/")[2];
			var selectedCellId = cellModel.oModel.oData.cells[selectedIndex].key;
			sap.ui.getCore().AppContext.celluleId = selectedCellId;
			var oBindingContext = oEvent.getParameter("listItem").getBindingContext();
			return new Promise(function(fnResolve) {
				this.doNavigate("Bureau", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		_onSearchFieldLiveChange3: function(oEvent) {
			var sControlId =
				"sap_Responsive_Page_0-content-sap_m_List-1511558751838-3ff835262cd8d1b30edd966c1_S1-2217dfa30e3813430edd96af2_S2-34b26c6ead123d140ee0994b6_S6";
			var oControl = this.getView().byId(sControlId);

			// Get the search query, regardless of the triggered event ('query' for the search event, 'newValue' for the liveChange one).
			var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
			var sSourceId = oEvent.getSource().getId();

			return new Promise(function(fnResolve) {
				var aFinalFilters = [];

				var aFilters = [];
				// 1) Search filters (with OR)
				if (sQuery && sQuery.length > 0) {

					aFilters.push(new sap.ui.model.Filter("ID", sap.ui.model.FilterOperator.Contains, sQuery));

					aFilters.push(new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery));

					var iQuery = parseFloat(sQuery);
					if (!isNaN(iQuery)) {
						aFilters.push(new sap.ui.model.Filter("immo", sap.ui.model.FilterOperator.EQ, sQuery));
					}

					aFilters.push(new sap.ui.model.Filter("state", sap.ui.model.FilterOperator.Contains, sQuery));

				}

				var aFinalFilters = aFilters.length > 0 ? [new sap.ui.model.Filter(aFilters, false)] : [];
				var oBindingOptions = this.updateBindingOptions(sControlId, {
					filters: aFinalFilters
				}, sSourceId);
				var oBindingInfo = oControl.getBindingInfo("items");
				oControl.bindAggregation("items", {
					model: oBindingInfo.model,
					path: oBindingInfo.path,
					parameters: oBindingInfo.parameters,
					template: oBindingInfo.template,
					sorter: oBindingOptions.sorters,
					filters: oBindingOptions.filters
				});
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		updateBindingOptions: function(sCollectionId, oBindingData, sSourceId) {
			this.mBindingOptions[sCollectionId] = this.mBindingOptions[sCollectionId] || {};

			var aSorters = oBindingData.sorters === undefined ? this.mBindingOptions[sCollectionId].sorters : oBindingData.sorters;
			var oGroupby = oBindingData.groupby === undefined ? this.mBindingOptions[sCollectionId].groupby : oBindingData.groupby;

			// 1) Update the filters map for the given collection and source
			this.mBindingOptions[sCollectionId].sorters = aSorters;
			this.mBindingOptions[sCollectionId].groupby = oGroupby;
			this.mBindingOptions[sCollectionId].filters = this.mBindingOptions[sCollectionId].filters || {};
			this.mBindingOptions[sCollectionId].filters[sSourceId] = oBindingData.filters || [];

			// 2) Reapply all the filters and sorters
			var aFilters = [];
			for (var key in this.mBindingOptions[sCollectionId].filters) {
				aFilters = aFilters.concat(this.mBindingOptions[sCollectionId].filters[key]);
			}

			// Add the groupby first in the sorters array
			if (oGroupby) {
				aSorters = aSorters ? [oGroupby].concat(aSorters) : [oGroupby];
			}

			var aFinalFilters = aFilters.length > 0 ? [new sap.ui.model.Filter(aFilters, true)] : undefined;
			return {
				filters: aFinalFilters,
				sorters: aSorters
			};

		},
		_onObjectListItemPress1: function(oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext();
			return new Promise(function(fnResolve) {

				this.doNavigate("Bureau", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		_onButtonPress5: function(oEvent) {

			var sPopoverName = "Popover2";
			this.mPopovers = this.mPopovers || {};
			var oPopover = this.mPopovers[sPopoverName];
			var oSource = oEvent.getSource();
			var oBindingContext = oSource.getBindingContext();
			var sPath = (oBindingContext) ? oBindingContext.getPath() : null;
			var oView;
			if (!oPopover) {
				this.getOwnerComponent().runAsOwner(function() {
					oView = sap.ui.xmlview({
						viewName: "com.sap.build.standard.buildPoleEmploiEpf.view." + sPopoverName
					});
					this.getView().addDependent(oView);
					oView.getController().setRouter(this.oRouter);
					oPopover = oView.getContent()[0];
					oPopover.setPlacement("Auto");
					this.mPopovers[sPopoverName] = oPopover;
				}.bind(this));
			}

			return new Promise(function(fnResolve) {
				oPopover.attachEventOnce("afterOpen", null, fnResolve);
				oPopover.openBy(oSource);
				if (oView) {
					oPopover.attachAfterOpen(function() {
						oPopover.rerender();
					});
				} else {
					oView = oPopover.getParent();
				}

				var oModel = this.getView().getModel();
				if (oModel) {
					oView.setModel(oModel);
				}
				if (sPath) {
					var oParams = oView.getController().getBindingParameters();
					oView.bindObject({
						path: sPath,
						parameters: oParams
					});
				}
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		_onButtonPress6: function(oEvent) {

			var oBindingContext = oEvent.getSource().getBindingContext();

			return new Promise(function(fnResolve) {

				this.doNavigate("Regions", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		_onButtonPress7: function(oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext();
			return new Promise(function(fnResolve) {
				this.doNavigate("Regions", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});
		},
		onInit: function() {
			this.mBindingOptions = {};
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("Accueil").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
		}
	});
}, /* bExport= */ true);