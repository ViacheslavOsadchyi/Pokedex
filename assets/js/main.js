"use strict";

var pokedexSects, i, pokedexSect, pokedex;
pokedexSects = document.getElementsByClassName( "pokedex" );
for( i = 0; i < pokedexSects.length; i++ ){
	pokedexSect = pokedexSects[i];
	pokedex = new Pokedex ( pokedexSect );
}

/**
@class Pokedex 									Main Pokedex Class
 	@method buildRequest 							build request url
		@param uri { Array }  							uri parts
		@param args { Object }  						GET request arguments
 	@method getData 								send xhr, run onload callback with onprocessed callback as parameter if it exists
		@param req { String } 							request url
		@param onloadCallback { function } 				onload callback
		@param onprocCallback { function } 				callback passed to onload function
 	@method getChunk 								load pokemons chunk using buildRequest, getData and procChunk
		@param limit { number }							requested number of pokemons
		@param offset { number } 						offset number in sequence of pokemons
		@param callback { function } 					function will be called when the pokemons are shown
 	@method nextChunk 								load next pokemons chunk using getData and procChunk
		@param callback { function } 					function will be called when the pokemons are shown
	@method procChunk 								process responce JSON, build items markup, show them and call callback function if it exists
		@param xhr 	{ XMLHttpRequest object } 			xhr object
		@param callback { function } 					function will be called when the items are shown
 	@method showFullInfo 							get pokemon Dossier markup, attach events and show
		@param item { DOM Node } 						pokemon grid item
	@method createDsr 								create pokemon Dossier markup
		@param data { Object } 							assembled data for Dossier
	@method attachDsrEvents 						attach events to Dossier markup
		@param dsr { DOM Node } 						Dossier Node object
	@property el { DOM Node } 						Application Section
	@property servant { PokedexServant instance } 	interface to some helper functions
	@property meta { object } 						API response meta
 	@property grid { PokedexGrid instance } 		grid controller
**/ 

function Pokedex ( pokedexSect ){
	var grid;
	if ( !pokedexSect ){
		return false;
	}
	this.buildRequest 		= Pokedex__buildRequest;
	this.getData 			= Pokedex__getData;
	this.getChunk 			= Pokedex__getChunk;
	this.nextChunk 			= Pokedex__nextChunk;
	this.procChunk 			= Pokedex__procChunk;
	this.showFullInfo 		= Pokedex__showFullInfo;
	this.createDsr 			= Pokedex__createDsr;
	this.attachDsrEvents	= Pokedex__attachDsrEvents;
	this.el 			= pokedexSect;
	this.servant 		= new PokedexServant ();
	this.meta 			= {};
	grid 				= this.el.querySelector( ".pokemonList__grid" );
	this.grid 			= new PokedexGrid ( grid, this );	
	this.getChunk( 12, 0, this.grid.gridLoader.hide.bind( this.grid.gridLoader ) );
}
function Pokedex__buildRequest ( uri, args ){
	var uri = typeof uri === "object" ? uri : [];
	var args = typeof args === "object" ? args : {};
	var uri_str = uri.join("/");
	var req, args_str, arg_key, arg_val;
	req = args_str = "";
	for ( arg_key in args ){
		args_str += args_str.length ? "&" : "";
		args_str += arg_key + "=" + args[arg_key];
	}
	req += uri_str.length ? uri_str + "/" : "";
	req += args_str.length ? "?" + args_str : "";
	return req;
}
function Pokedex__getData ( req, onloadCallback, onprocCallback ){
	var xhr = new XMLHttpRequest();
	xhr.open( "GET", req, true );
	xhr.onload = onloadCallback.bind( this, xhr, onprocCallback );
	xhr.send();
}
function Pokedex__getChunk ( limit, offset, callback ){
	var limit = limit !== undefined ? limit : 12;
	var offset = offset !== undefined ? offset : 0;
	var req = this.buildRequest( ["http://pokeapi.co/api/v1/pokemon"], {
		"limit"		: limit,
		"offset"	: offset
	});
	this.getData( req, this.procChunk, callback );
}
function Pokedex__nextChunk ( callback ){
	if ( !this.meta.next ){
		return false;
	}
	this.getData( "http://pokeapi.co" + this.meta.next, this.procChunk, callback );	
}
function Pokedex__procChunk ( xhr, callback ){
	var responseData = {};
	var response, responseData, objects, i, object, loadedItems, item, img;
	if ( xhr.status === 200 ){
		response = xhr.responseText;
		try{
			responseData = JSON.parse( response );
		}
		catch( err ){
			console.log( "JSON parse error" );
		}
		this.meta = responseData.meta !== undefined ? responseData.meta : this.meta;
		objects = responseData.objects !== undefined ? responseData.objects : new Array();
		loadedItems = [];
		for ( i = 0; i < objects.length; i++ ){
			object = objects[i];
			item = this.grid.buildIem( object );
			this.grid.attachItemEvents( item );
			img = item.querySelector( ".pokemonImg" );
			this.servant.waitFor( function ( img ){
				return img.complete;
			}.bind( null, img ), function ( loadedItems, item ){
				loadedItems.push( item );
			}.bind( null, loadedItems, item ), 50 );
		}
		this.servant.waitFor( function ( loadedItems, objects ){
			return loadedItems.length === objects.length;				
		}.bind( null, loadedItems, objects ),  this.grid.addNewItems.bind( this.grid, loadedItems, callback ), 50 );
	}	
}
function Pokedex__showFullInfo ( item ){
	var dsrHolder = this.el.querySelector( ".pokemonInfo__content" );
	var dataField = item.querySelector( ".pokemonList__data" );
	var JSONdata = dataField.value;
	var data = JSON.parse( JSONdata );
	var dsr = this.createDsr( data );
	this.attachDsrEvents( dsr );
	while ( dsrHolder.firstChild ){	/* remove previous */
		dsrHolder.removeChild( dsrHolder.firstChild );
	}
	dsrHolder.appendChild( dsr );
	if ( this.servant.hasClass( dsrHolder, "empty" ) ){
		this.servant.removeClass( dsrHolder, "empty" );
	}
}
function Pokedex__createDsr ( data ){
	var info = data.info;
	var types = data.types;
	var infoKeys = Object.keys( info );
	var dsrEl = document.createElement( "div" );
	var dsrMarkup = "";
	var i, type, key, prop;
	dsrEl.className = "pokemonDsr thumbnail";
	dsrMarkup += "<img src=\"http://pokeapi.co/media/img/" + data.id + ".png/\" class=\"pokemonDsr__photo pokeballBg\" alt />";
	dsrMarkup += "<h2 class=\"pokemonDsr_name h3\">" + data.name + " #" + data.id + "</h2>";
	dsrMarkup += "<table class='pokemonDsr__props table-striped'>";
		dsrMarkup += "<tr>";
			dsrMarkup += "<td>Types</td>";
			dsrMarkup += "<td>";
				dsrMarkup += "<ul class='pokemonDsr__types pokemonTypes'>";
				for ( i = 0; i < types.length; i++ ){
					type = types[i];
					dsrMarkup += "<li class=\"pokemonDsr__type pokemonType pokemonType_type_" + type + " btn btn-xs\" data-type=\"" + type + "\">" + type + "</li>";
				}
				dsrMarkup += "</ul>";
			dsrMarkup += "</td>";
		dsrMarkup += "</tr>";
		for ( i = 0; i < infoKeys.length; i++ ){
			key = infoKeys[i];
			prop = info[key];
			dsrMarkup  += "<tr>";
				dsrMarkup  += "<td>" + prop[0] + "</td>";
				dsrMarkup  += "<td>" + prop[1] + "</td>";
			dsrMarkup  += "</tr>";
		}
	dsrMarkup += "</table>";
	dsrEl.innerHTML = dsrMarkup;
	return dsrEl;
}
function Pokedex__attachDsrEvents ( dsrEl ){
	var typeBtns, typeBtn, photo;
	typeBtns = dsrEl.getElementsByClassName( "pokemonDsr__type" );
	for ( i = 0; i < typeBtns.length; i++ ){
		typeBtn = typeBtns[i];
		typeBtn.addEventListener( "click", function ( typeEl ){
			this.grid.filterItemsByType( typeEl.dataset.type );
			this.grid.typeFilter.set( typeEl.dataset.type );
		}.bind( this, typeBtn ), false );
	}
	photo = dsrEl.querySelector( ".pokemonDsr__photo" );
	this.servant.waitFor( function ( photo ){
		return photo.complete;
	}.bind( null, photo ), function ( photo ) {
		this.servant.removeClass( photo, "pokeballBg" );
	}.bind( this, photo ), 50);
}

/**
@class PokedexGrid 											Grid Controller Class
	@property el { DOM Node }									grid container
	@property pkdxInst { Pokedex instance }						Pokedex App instance
	@property iso { Isotope instance } 							Isotope ( massonry plugin ) controller
	@property gridLoader { PokedexLoader instance } 			grid loader controller
	@property moreLoader { PokedexLoader instance } 			"load more" loader controller
	@property typeFilter { PokedexGridTypeFilter instance } 	Type Filter controller
	@method buildItem 											build grid item markup
		@param data { Object }										data about pokemon provided by server
	@method assembleItemData 									assemble item data needed for Dossier
		@param data { Object } 										data about pokemon provided by server
		@param typeNames { Array } 									types to which pokemon belongs
	@method attachItemEvents 									attach events to grid item
		@param item { DOM Node } 									item element
	@method addNewItems 										add new items to grid
		@param items { Array }										items would be added
		@param callback { function } 								function would be called when the items will be added
	@method filterItemsByType 									arrange grid and show only items of special type
		@param type { String }										type
	@method unfilterItemsByType 								arrange grid and show all items
**/

function PokedexGrid ( gridEl, pkdxInstance ){
	var gridLoaderWrapper, moreLoader, moreBtn, typeFilterEl;
	if ( !gridEl ){
		return false;
	}
	this.el = gridEl;
	this.pkdxInst = pkdxInstance;
	this.iso = new Isotope ( this.el, {
		itemSelector 	: ".pokemonList__item",
		layoutMode 		: "fitRows"
	});
	gridLoaderWrapper = this.pkdxInst.el.querySelector( ".pokemonList__gridLoaderWrapper" );
	this.gridLoader = new PokedexLoader ( gridLoaderWrapper, "sectLoaderWrapper_hidden", this.pkdxInst );
	moreLoader = this.pkdxInst.el.querySelector( ".pokemonList__moreLoader" );
	this.moreLoader = new PokedexLoader( moreLoader, "pokemonList__moreLoader_hidden", this.pkdxInst );
	moreBtn = this.pkdxInst.el.querySelector( ".pokemonList__more" );
	if ( moreBtn !== null ){
		moreBtn.addEventListener( "click", function () {
			this.moreLoader.show();
			this.pkdxInst.nextChunk( function (){	
				this.moreLoader.hide();
			}.bind( this ) );
		}.bind( this ), false );
	}
	this.typeFilter = null;
	typeFilterEl = this.pkdxInst.el.querySelector( ".pokedex__typeFilter" );
	if ( typeFilterEl !== null ){
		this.typeFilter = new PokedexGridTypeFilter( typeFilterEl, this );
	}
	this.buildIem = PokedexGrid__buildItem;
	this.assembleItemData = PokedexGrid__assembleItemData;
	this.attachItemEvents = PokedexGrid__attachItemEvents;
	this.addNewItems = PokedexGrid__addNewItems;
	this.filterItemsByType = PokedexGrid__filterItemsByType;
	this.unfilterItemsByType = PokedexGrid__unfilterItemsByType;
}
function PokedexGrid__addNewItems ( items, callback ){
	var i, item;
	for ( i = 0; i < items.length; i++ ){
		item = items[i];
		this.el.appendChild( item );					
	}
	this.iso.appended( items );
	if ( typeof callback === "function" ){
		callback();
	}
}
function PokedexGrid__filterItemsByType ( type ){
	this.iso.arrange( {
		filter : function ( item ){
			var dataField = item.querySelector( ".pokemonList__data" );
			var jsonData = dataField.value;
			var data = JSON.parse( jsonData );
			var types = data.types;
			if ( types.indexOf( type ) !== -1 ){
				return true;
			}
			else{
				return false;
			}
		}
	} )
}
function PokedexGrid__unfilterItemsByType (){
	this.iso.arrange({
		filter : null
	});
}
function PokedexGrid__buildItem ( data ){
	var i, type, itemMarkup;
	var item = document.createElement( "div" );
	var typeNames = [];
	var typeNamesStr = "";
	var procData, procDataJSON;
	item.className = "pokemonList__item col-xs-12 col-sm-4";
	itemMarkup = "<div class=\"pokemonList__itemContent thumbnail\">";
		itemMarkup += "<img src=\"http://pokeapi.co/media/img/" + data.pkdx_id + ".png/\" class=\"pokemonList__img pokemonImg\" alt />";
		itemMarkup += "<h2 class=\"pokemonList__name pokemonName h4\">" + data.name + "</h2>";
		if ( data.types.length ){
			itemMarkup += "<ul class=\"pokemonList__types pokemonTypes\">";
			for ( i = 0; i < data.types.length; i++ ){
				type = data.types[i];
				itemMarkup += "<li class=\"pokemonList__type pokemonType pokemonType_type_" + type.name + " btn btn-xs\" data-type=\"" + type.name + "\">" + type.name + "</li>";
				typeNames.push( type.name );
			}
			itemMarkup += "</ul>";		
		}
		procData = this.assembleItemData ( data, typeNames );
		procDataJSON = JSON.stringify( procData );
		itemMarkup += "<input type=\"hidden\" class=\"pokemonList__data pokemonData\" value='" + procDataJSON + "' />";
	itemMarkup += "</div>";
	item.innerHTML = itemMarkup;
	return item;
}
function PokedexGrid__assembleItemData ( data, typeNames ){
	var procData = {
		"name"	: data.name,
		"id"	: data.pkdx_id,
		info	: {
			"attack" 	: [ "Atack", data.attack ],
			"defense"	: [ "Defense", data.defense ],
			"hp"		: [ "HP", data.hp ],
			"sp_atk"	: [ "SP Atack", data.sp_atk ],
			"sp_def"	: [ "SP Defence", data.sp_def ],
			"speed"		: [ "Speed", data.speed ],
			"weight"	: [ "Weight", data.weight ],
			"tot_moves"	: [ "Total moves", data.moves.length ]
		},
		"types" : typeNames			
	}
	return procData;
}
function PokedexGrid__attachItemEvents ( item ){
	var img = item.querySelector( ".pokemonImg" );
	var title = item.querySelector( ".pokemonList__name" );
	var typeEls = item.getElementsByClassName( "pokemonList__type" );
	var j, typeEl;
	img.onerror = function (){
		var that = this;
		that.src = "../img/pokeball.png";
	}
	for ( j = 0; j < typeEls.length; j++ ){
		typeEl = typeEls[j];
		typeEl.addEventListener( "click", function ( typeEl ){
			this.filterItemsByType( typeEl.dataset.type );
			this.typeFilter.set( typeEl.dataset.type );
		}.bind( this, typeEl ), false );
	}
	title.addEventListener( "click", this.pkdxInst.showFullInfo.bind( this.pkdxInst, item ), false );
	img.addEventListener( "click", this.pkdxInst.showFullInfo.bind( this.pkdxInst, item ), false );
}

/**
@class PokedexGridTypeFilter 								Type Filter Controller Class
	@property gridInst { PokedexGrid instance }					grid controller instance
	@property el { DOM Node }									filter element
	@property stateEl { DOM Node } 								filter state label element
	@property resetEl { DOM Node }								filter reset button
	@property hiddenClass { String }       						CSS class that make filter element hidden
	@method set 												set filter state and call grid arrangement
		@param type { String } 										type
	@method reset 												reset filter state and call grid arrangement
**/

function PokedexGridTypeFilter ( typeFilterEl, gridInst ){
	var typeFilterStateEl, typeFilterResetEl;
	typeFilterStateEl = typeFilterEl.querySelector( ".pokedex__typeFilterState" );
	typeFilterResetEl = typeFilterEl.querySelector( ".pokedex__typeFilterReset" );
	this.gridInst 	= gridInst;
	this.el 		= typeFilterEl;
	this.stateEl 	= typeFilterStateEl;
	this.resetEl 	= typeFilterResetEl;
	this.hiddenClass= "hidden";
	this.set 		= PokedexGridTypeFilter__set;
	this.reset 		= PokedexGridTypeFilter__reset;
	this.resetEl.addEventListener( "click", this.reset.bind( this ), false );
}
function PokedexGridTypeFilter__set ( type ){
	var mask = new RegExp ( "pokemonType_type_\\w+", "g" );
	var match = mask.test( this.stateEl.className );
	var newTypeMod = "pokemonType_type_" + type;
	var prevTypeMod = "";
	if ( match ){
		this.stateEl.className = this.stateEl.className.replace( mask, newTypeMod );
		this.resetEl.className = this.resetEl.className.replace( mask, newTypeMod );
	}else{
		this.gridInst.pkdxInst.servant.addClass( this.stateEl, newTypeMod );
		this.gridInst.pkdxInst.servant.addClass( this.resetEl, newTypeMod );
	}
	this.stateEl.innerText = type;
	if ( this.gridInst.pkdxInst.servant.hasClass( this.el, this.hiddenClass ) ){
		this.gridInst.pkdxInst.servant.removeClass( this.el, this.hiddenClass );
	}
}
function PokedexGridTypeFilter__reset (){
	if ( !this.gridInst.pkdxInst.servant.hasClass( this.el, this.hiddenClass ) ){
		this.gridInst.pkdxInst.servant.addClass( this.el, this.hiddenClass );
	}
	this.gridInst.unfilterItemsByType();	
}

/**
@class PokedexLoader 								Loader Controller Class
	@property el { DOM Node } 							loader element
	@property hiddenClass { String } 					CSS class that make loader hidden
	@property pkdxInst { Pokedex instance } 			Pokedex App instance
	@method show 										make loader visible
	@method hide 										make loader hidden
**/

function PokedexLoader ( loaderEl, hiddenClass, pkdxInst ){
	if ( !loaderEl || !hiddenClass || typeof pkdxInst !== "object" ){
		return false;
	}
	this.el 			= loaderEl;
	this.hiddenClass 	= hiddenClass;
	this.pkdxInst 		= pkdxInst;
	this.show 			= PokedexLoader__show;
	this.hide 			= PokedexLoader__hide;
}
function PokedexLoader__show (){
	if ( this.pkdxInst.servant.hasClass( this.el, this.hiddenClass ) ){
		this.pkdxInst.servant.removeClass( this.el, this.hiddenClass );		
	}
}
function PokedexLoader__hide (){
	if ( !this.pkdxInst.servant.hasClass( this.el, this.hiddenClass ) ){
		this.pkdxInst.servant.addClass( this.el, this.hiddenClass );		
	}	
}

/**
@class PokedexServant 								Interface Class for some helper functions
	@method hasClass 									check if element className attribute includes specified class
		@param el { DOM Node } 								element would be checked
		@param cls_name { String } 							class name
	@method addClass 									add specified class to element className attribute
		@param el { DOM Node } 								element to which class would be added
		@param cls_name { String } 							class name
	@method removeClass 								remove specified class from element className attribute
		@param el { DOM Node } 								element from which class would be removed
		@param cls_name { String } 							class name	
	@method waitFor 									recursive function that either call callback if the condition is matched or call itself, after specified interval, if not 
		@param cond { function } 							condition function
		@param callback { function } 						function would be called if the condition will be matched
		@param int { number } 								interval for recursive calls
**/

function PokedexServant (){
	this.hasClass = PokedexServant__hasClass;
	this.addClass = PokedexServant__addClass;
	this.removeClass = PokedexServant__removeClass;
	this.waitFor = PokedexServant__waitFor;
}
function PokedexServant__hasClass ( el, cls_name ){
	var re = new RegExp( "(^|\\s)" + cls_name + "(\\s|$)", 'g' );
	return re.test( el.className );
}
function PokedexServant__addClass ( el, cls_name ){
	el.className =  el.className.length ? el.className + " " + cls_name : cls_name;		
}
function PokedexServant__removeClass ( el, cls_name ){
	var re = new RegExp( "\\s?" + cls_name, "g" );
	el.className = el.className.replace( re, '' );
}
function PokedexServant__waitFor ( cond, callback, int ){
	if ( typeof cond !== "function" || typeof callback !== "function" ){
		return false;
	}
	var int = int !== undefined ? int : 50;
	if ( cond() ){
		callback();
	}
	else{
		setTimeout( PokedexServant__waitFor.bind( null, cond, callback, int ), int );
	}
}
