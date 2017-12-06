sap.ui.define(["sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"./utilities",
	"sap/ui/core/routing/History"
], function(BaseController, MessageBox, Utilities, History) {
	"use strict";

	function showDialog(context, show) {
		var oDialog = context.byId("BusyDialog");
		if (show) {
			oDialog.open();
		} else {
			oDialog.close();
		}
	}

	function deg2Rad(deg) {
		return deg * Math.PI / 180;
	}

	function comparePositions(lat1, lon1, lat2, lon2) {
		lat1 = deg2Rad(lat1);
		lat2 = deg2Rad(lat2);
		lon1 = deg2Rad(lon1);
		lon2 = deg2Rad(lon2);
		var R = 6371; // km
		var x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
		var y = (lat2 - lat1);
		var d = Math.sqrt(x * x + y * y) * R;
		return d;
	}

	function buildToast() {
		return new Promise(function(fnResolve) {
			var sTargetPos = "center top";
			sTargetPos = (sTargetPos === "default") ? undefined : sTargetPos;
			sap.m.MessageToast.show("Localisation effectuée", {
				onClose: fnResolve,
				duration: 1000 || 3000,
				at: sTargetPos,
				my: sTargetPos
			});
		});
	}

	function nearestOffice(latitude, longitude, data, context) {
		var mindif = 99999;
		var closest;
		for (var index = 0; index < data.length; ++index) {
			var dif = comparePositions(latitude, longitude, data[index][1], data[index][2]);
			if (dif < mindif) {
				closest = index;
				mindif = dif;
			}
		}
		if(!closest){
			closest = 0;
		}
		buildToast();
		if(data[closest]){
			sap.ui.getCore().AppContext.officeId =  (data[closest]).BATIMENT_ID;
			var oRouter = sap.ui.core.UIComponent.getRouterFor(context);
				oRouter.navTo("Accueil", {});
		}
		else{
			MessageBox.error("Erreur lors de la lecture de la position, merci de la saisir manuellement");
		}
	}

	function filterPositionsByPostCode(position, postalCode, context) {
		var lat = position.coords.latitude;
		var long = position.coords.longitude;
		$.ajax({
			url: "/datasappe/applisappe/services/"+
			"applisappe.xsodata/Batiment?$filter=BATIMENT_VILLE_ID eq " + postalCode,
			type: "GET",
			success: function(filteredData, status) {
				return nearestOffice(lat, long, filteredData.d.results, context);
			},
			error: function(resultat, status, error) {
				MessageBox.error("Erreur : "+ error.message);
			}, 
			dataType: "json"
		});
	}

	function reverseGeoLoc(position, context) {
		var lat = position.coords.latitude;
		var long = position.coords.longitude;
		$.ajax({
			url: "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + long + "&key=" +
				"AIzaSyACL8sYHA7uHdJiHQ6QKIvcqCrTyvLXW38",
			type: "GET",
			success: function(result, statut) {
				var postalCode = result.results[0].address_components[6].long_name;
				filterPositionsByPostCode(position, postalCode, context);
			},
			error: function(resultat, statut, error) {
				MessageBox.error("Erreur lors de la lecture de la position");
			},
			complete: function() {
				showDialog(context, false);
			}
		});
	}

	function buildErrorDialog(message, onCloseFunction) {
		MessageBox.error(message, {
			icon: MessageBox.Icon.ERROR,
			title: "Error",
			actions: [sap.m.MessageBox.Action.CLOSE],
			onClose: onCloseFunction
		});
	}

	function navTo(oEvent, context, target) {
		var router = sap.ui.core.UIComponent.getRouterFor(context);
		return router.navTo(target);
	}

	function showError(error, context) {
		showDialog(context, false);
		switch (error.code) {
			case error.PERMISSION_DENIED:
				buildErrorDialog("Merci d'autoriser la géolocalisation.", function(oEvent) {
					return navTo(oEvent, context, "Regions");
				});
				break;
			case error.POSITION_UNAVAILABLE:
				buildErrorDialog("Les informations de géolocalisation sont indisponibles.", function(oEvent) {
					return navTo(oEvent, context, "Regions");
				});
				break;
			case error.TIMEOUT:
				buildErrorDialog("La requête de géolocalisation a expiré.", function(oEvent) {
					return navTo(oEvent, context, "Regions");
				});
				break;
			case error.UNKNOWN_ERROR:
				buildErrorDialog("Une erreur s'est produite.", function(oEvent) {
					return navTo(oEvent, context, "Regions");
				});
				break;
		}
	}

	function getUserLoc(context) {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
				return reverseGeoLoc(position, context);
			}, function(error) {
				return showError(error, context);
			});
		} else {
			buildErrorDialog("La géolocation n'est pas supportée par ce navigateur.", function(oEvent) {
				return navTo(oEvent, context, "Regions");
			});
		}
	}

	return BaseController.extend("com.sap.build.standard.buildPoleEmploiEpf.controller.Regions", {
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

		},
		_onLocBtnClick: function(oEvent) {
			this.getPos();
			oEvent = jQuery.extend(true, {}, oEvent);
			
			
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
		_onListItemPress: function(oEvent) {

			var oBindingContext = oEvent.getParameter("listItem").getBindingContext();

			return new Promise(function(fnResolve) {
				this.doNavigate("Villes", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		_onSearchFieldLiveChange: function(oEvent) {
			var sControlId = "sap_Responsive_Page_0-content-sap_m_List-1511558751838";
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
		_onObjectListItemPress: function(oEvent) {

			var oBindingContext = oEvent.getSource().getBindingContext();

			return new Promise(function(fnResolve) {

				this.doNavigate("Villes", oBindingContext, fnResolve, "");
			}.bind(this)).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err.message);
				}
			});

		},
		_onButtonPress4: function(oEvent) {

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
		onInit: function() {
			this.mBindingOptions = {};
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("Regions").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
		},
		getPos: function() {
			showDialog(this, true);
			getUserLoc(this);
		}
	});
}, /* bExport= */ true);