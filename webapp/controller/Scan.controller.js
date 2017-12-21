sap.ui.define(["sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"./utilities",
	"sap/ui/core/routing/History"
], function(BaseController, MessageBox, Utilities, History) {
	"use strict";

	function getStream(stream) {
		window.stream = stream; // make stream available to console
		$("video")[0].srcObject = stream;
		// Refresh button list in case labels have become available
		return navigator.mediaDevices.enumerateDevices();
	}
	var scannedImmo = {};
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
			this.pageReset();
		},
		pageReset: function(){
			this.getView().byId("barcodeValue").removeStyleClass("inputOk").setValue("");
			this.getView().byId("immoName").setValue("");
			this.getView().byId("detection").setText("Detection non-activée cliquer sur le bouton en bas à droite pour l'activer.");
		},
		start: function() {
			var that = this;
			if (window.stream) {
				window.stream.getTracks().forEach(function(track) {
					track.stop();
				});
			}
			var videoSource = that.getView().byId("videoSet").getSelectedKey();
			var constraints;
			if (!videoSource) {
				constraints = {
					video: true,
					audio: false
				};
			} else {
				constraints = {
					video: {
						deviceId: videoSource ? {
							exact: videoSource
						} : undefined
					}
				};
			}

			navigator.getUserMedia(constraints, getStream, function() {
				MessageBox.error("Merci de verifier vos autorisations");
			});
		},
		getDevices: function(deviceInfos, context) {
			var videoSelect = context.getView().byId("videoSet");
			var model = new sap.ui.model.json.JSONModel();
			var arrayName = [];
			var camCount = 0;
			for (var i = 0; i !== deviceInfos.length; ++i) {
				var deviceInfo = deviceInfos[i];
				var option = document.createElement("option");
				option.value = deviceInfo.deviceId;
				if (deviceInfo.kind === "videoinput") {
					camCount ++;
					option.text = deviceInfo.label || "Camera " + (camCount);
					arrayName.push({
						name: deviceInfo.label || "Camera " + (camCount),
						value: deviceInfo.deviceId
					});
				}
			}
			model.setData({
				arrayName: arrayName
			});
			videoSelect.setModel(model, "videoSelectModel");
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
			//loadCameraView(that);
			if(!jQuery.isEmptyObject(scannedImmo)){
				sap.ui.getCore().AppContext.currentCellInventory.listImmo.push(scannedImmo);
				scannedImmo = {};
			}
			var input = that.getView().byId("barcodeValue").removeStyleClass("inputOk");
			var detectionIndicator = that.getView().byId("detection");
			detectionIndicator.setText("Detection en cours ...");
			input.setValue("");
			that.getView().byId("immoName").setValue("");
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
						/*Liste des formats : 
							code_128_reader
							ean_reader (ean 13)
							ean_8_reader
							code_39_reader
							code_39_vin_reader
							codabar_reader
							upc_reader
							upc_e_reader
							i2of5_reader
							2of5_reader
							code_93_reader*/
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
				var code = result.codeResult.code.toString();
				if (code) {
					jQuery.sap.log.debug("code detected " + code);
					input.setValue(code);
					Quagga.stop();
					input.addStyleClass("inputOk");
					detectionIndicator.setText("Code barre detecté, cliquer en bas à droite pour relancer la detection.");
					that.codeBarreCheck(code);
				}
			});
		},
		codeBarreCheck: function(code){
			var that = this;
			$.ajax({
			  type: "GET",
			  url: "/datasappe/applisappe/services/applisappe.xsodata/Immo?$filter=IMMO_CODEBARRES eq '"
			  + code + "'",
			  cache: false,
			  xhrFields: {withCredentials: true},
			  dataType: "json",
			  error : function(msg, textStatus,error) {
			  	MessageBox.error("Erreur : " + error.message);
			    console.log(textStatus);
			  },
			  success : function(data) {
				var result = data.d.results;
				that.barcodeAjaxSuccess(result, code);
			  }
			});
		},
		barcodeAjaxSuccess: function(result, code){
			var that = this;
			if(result.length === 1){
		  		that.immoParse(result);
		  	}
		  	else if (result.length > 1){
		  		MessageBox.error("Plusieures immobilisations sont associées à ce code-barre. Veuillez le renouveler.");
		  	}
		  	else{
		  		that.createImmo(code);	
		  	}
		},
		createImmo: function(barcode){
			var that = this;
			sap.ui.getCore().AppContext.immoBarCode = barcode;
			MessageBox.confirm("Le code-barre scanné n'est pas reconnu. Le code-barre est : " + barcode + 
			"\nVoulez-vous créer un nouveau bien associé à ce code-barre", function(input){
				that.newBarcodeBoxCallBack(input, that);
			}, "Code-barre non reconnu");
			
		},
		newBarcodeBoxCallBack: function(input, context){
			if (input === "OK"){
				var oRouter = sap.ui.core.UIComponent.getRouterFor(context);
				oRouter.navTo("CreationBien", {});
			}
			else{
				context.pageReset();
			}
		},
		immoParse: function(data){
			var that = this;
			var immo = {
				key: data[0].IMMO_ID,
				name: data[0].IMMO_NAME,
				serial: data[0].IMMO_NUMSERIE,
				state: data[0].IMMO_ETAT,
				date: new Date(),
				barcode: data[0].IMMO_CODEBARRES,
				cell: data[0].IMMO_CELLULE_ID,
				type: data[0].IMMO_TYPE_ID
			};
			if(immo.cell !== sap.ui.getCore().AppContext.celluleId){
				immo.relocalise = true;
				immo.newCell = sap.ui.getCore().AppContext.celluleId;
			}
			that.getView().byId("immoName").setValue(immo.name);
			scannedImmo = immo;
		},
		onInit: function() {
			var that = this;
			navigator.mediaDevices.enumerateDevices().then(function(deviceInfos) {
				return that.getDevices(deviceInfos, that);
			}).catch(function(error) {
				MessageBox.error(error.message);
			});
			this.mBindingOptions = {};
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("Scan").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
			that.start();
		}
	});
}, /* bExport= */ true);