sap.ui.define(["sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"./utilities",
	"sap/ui/core/routing/History"
], function(BaseController, MessageBox, Utilities, History) {
	"use strict";

	function loadCameraView() {
		function hasGetUserMedia() {
			return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
				navigator.mozGetUserMedia || navigator.msGetUserMedia);
		}
		if (hasGetUserMedia()) {
			var video = $("video");
			navigator.getUserMedia({
				video: true,
				audio: false
			}, function(localMediaStream) {
				video["0"].src = window.URL.createObjectURL(localMediaStream);
			}, function() {
				MessageBox.error("Merci de verifier vos autorisations");
			});
		} else {
			MessageBox.error("La fonctionnalité n'est pas supportée par votre navigateur");
			video.src = "somevideo.webm"; // fallback.
		}
	}

	return BaseController.extend("com.sap.build.standard.buildPoleEmploiEpf.controller.Scan", {
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
		_onPageNavButtonPress1: function(oEvent) {

			var oBindingContext = oEvent.getSource().getBindingContext();

			return new Promise(function(fnResolve) {

				this.doNavigate("Bureau", oBindingContext, fnResolve, "");
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
		_onButtonPress1: function() {
			return new Promise(function(fnResolve) {
				sap.m.MessageBox.confirm("Veuillez confirmer que le bien est inutilisable", {
					title: "Déclarer un bien",
					actions: ["Confirmer", "Annuler"],
					onClose: function(sActionClicked) {
						fnResolve(sActionClicked === "Confirmer");
					}
				});
			}).catch(function(err) {
				if (err !== undefined) {
					MessageBox.error(err);
				}
			});

		},
		_onScanButtonPress: function() {
			var that = this;
			loadCameraView();
			var liveStreamConfig = { //See Quagga documentation for more details
				inputStream: {
					type: "LiveStream",
					target: document.querySelector("video"),
					constraints: {
						width: {
							min: 640
						},
						height: {
							min: 480
						},
						aspectRatio: {
							min: 1,
							max: 100
						},
						facingMode: "environment" // or "user" for the front camera
					},
					area: { // defines rectangle of the detection/localization area
						top: "0%", // top offset
						right: "0%", // right offset
						left: "0%", // left offset
						bottom: "0%" // bottom offset
					},
					singleChannel: false // true: only the red color-channel is read
				},
				locator: {
					halfSample: true,
					patchSize: "medium", // x-small, small, medium, large, x-large
					debug: {
						showCanvas: false,
						showPatches: false,
						showFoundPatches: false,
						showSkeleton: false,
						showLabels: false,
						showPatchLabels: false,
						showRemainingPatchLabels: false,
						boxFromPatches: {
							showTransformed: false,
							showTransformedBox: false,
							showBB: false
						}
					}
				},
				numOfWorkers: (navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4),
				decoder: {
					readers: ["ean_reader"
						//{"format":"ean_reader","config":{}}
					]
				},
				locate: true
			};

			// Start the live stream scanner
			Quagga.init(liveStreamConfig, function(err) {
				if (err) {
					MessageBox.error(err.message);
					Quagga.stop();
					return;
				}
				Quagga.start();
			});

			// Executes when barcode recognised
			Quagga.onDetected(function(result) {
				if (result.codeResult.code) {
					jQuery.sap.log.debug("code detected " + result.codeResult.code);
					var input = $(".barcode input");
					input["0"].value = result.codeResult.code;
					Quagga.stop();
					that.getView().byId("barcodeValue").addStyleClass("inputOk");
				}
			});
		},
		onInit: function() {

			this.mBindingOptions = {};
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("Scan").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

		}
	});
}, /* bExport= */ true);