(function(){
	'use strict';
	var MAX_AMOUNT = 99;
	var MIN_AMOUNT = 0.5;
	//var MAJORITY_SEATS = 326;

	var allParties = ["AC","AD","AGS","APNI","APP","AWL","AWP","BB","BCP","Bean","Best","BGPV","BIB","BIC","Blue","BNP","BP Elvis","C28","Cam Soc","CG","Ch M","Ch P","CIP","CITY","CNPG","Comm","Comm L","Con","Cor D","CPA","CSP","CTDP","CURE","D Lab","D Nat","DDP","DUP","ED","EIP","EPA","FAWG","FDP","FFR","Grn","GSOT","Hum","ICHC","IEAC","IFED","ILEU","Impact","Ind1","Ind2","Ind3","Ind4","Ind5","IPT","ISGB","ISQM","IUK","IVH","IZB","JAC","Joy","JP","Lab","Land","LD","Lib","Libert","LIND","LLPB","LTT","MACI","MCP","MEDI","MEP","MIF","MK","MPEA","MRLP","MRP","Nat Lib","NCDV","ND","New","NF","NFP","NICF","Nobody","NSPS","PBP","PC","Pirate","PNDP","Poet","PPBF","PPE","PPNV","Reform","Respect","Rest","RRG","RTBP","SACL","Sci","SDLP","SEP","SF","SIG","SJP","SKGP","SMA","SMRA","SNP","Soc","Soc Alt","Soc Dem","Soc Lab","South","Speaker","SSP","TF","TOC","Trust","TUSC","TUV","UCUNF","UKIP","UPS","UV","VCCA","Vote","Wessex Reg","WRP","You","Youth","YRDPL"];
	var partyIds = {'Lab':'labour','Con':'tory','LD':'libdem','SNP':'snp','Grn':'green','Respect':'respect','SDLP':'sdlp','PC':'pc','DUP':'dup','UUP':'uup','SF':'sf','UKIP':'ukip'};
	var partyFullnames = {'Lab':'Labour','Con':'Conservative','LD':'Liberal Democrat','SNP':'Scottish National Party','Grn':'Green party','Respect':'The Respect Party','SDLP':'SDLP','PC':'Plaid Cymru','DUP':'dup','UUP':'uup','SF':'sf','UKIP':'UKIP','Ind1':'Independant 1','Ind2':'Independant 2','Ind3':'Independant 3','Ind4':'Independant 4','Ind5':'Independant 5'};


	var seats;
	var selectedId = null;
	var detailEl = document.querySelector('.detail');
	var tableEl = detailEl.querySelector('table');
	var nameEl = tableEl.querySelector('th');
	var tbodyEl = tableEl.querySelector('tbody');
	

	var resultEl = document.querySelector('.current-projection-result');
	var winnerEl = resultEl.querySelector('.winner');
	var descriptionEl = winnerEl.querySelector('.description');

	var numberOfInputs = 0;
	var inputElements = {};
	var barElements = {};
	var initialDistribution = {};
	var currentBaseDistribution = {};
	var previousState = {};

	function setPartyBarWidth(party, width){
		//barElements[party].style.width = 'calc('+width + '% + 10px)';
		barElements[party].style.width = (width*2.0) + 10+"px";
	}

	function ElectionProjector(dataUrl) {
		this.loadData(dataUrl);
	}

	ElectionProjector.prototype.initialise = function(initialResults){

		initialDistribution = initialResults;

		for (var party in initialDistribution) {
			inputElements[party] = document.getElementById(party + '_input');
			barElements[party] = document.querySelector('.controls .party-row.' + party + ' .progress-bar');
			numberOfInputs += 1;
		}

		this.setProjection(initialDistribution);
		this.updateTotalNumberOfSeats();

	};

	ElectionProjector.prototype.setProjection = function(projectedValues){
		currentBaseDistribution = projectedValues;
		for (var party in projectedValues) {
			previousState[party] = inputElements[party].value = projectedValues[party];
			setPartyBarWidth(party, projectedValues[party]);
		}
	};

	ElectionProjector.prototype.resetPercentages = function(){
		this.setProjection(currentBaseDistribution);
		this.updateVotes();
		this.updateTotalNumberOfSeats();
	};

	ElectionProjector.prototype.recalculateSeats = function(node) {

		this.reAdjustDistribution(node.id);
		this.updateVotes();
		this.updateTotalNumberOfSeats();

	};

	ElectionProjector.prototype.updateVotes = function() {
		var voteDiffs = {};
		var defaultDiff = previousState.other / initialDistribution.other;

		for (var i = 0; i < allParties.length; i++) {
			voteDiffs[allParties[i]] = defaultDiff;
		}
		for (var partyId in initialDistribution) {
			voteDiffs[this.getPartyCodeById(partyId)] = previousState[partyId] / initialDistribution[partyId];
		}

		for (var id in seats){
			var constituency = seats[id];
			for (var voteDiffParty in voteDiffs) {
				if(constituency.hasOwnProperty(voteDiffParty)){
					constituency[voteDiffParty + '_adjusted'] = Math.round( (constituency[voteDiffParty] * voteDiffs[voteDiffParty] ) );
				}
			}
			this.calculateSeatColor(constituency);
		}
	};

	ElectionProjector.prototype.reAdjustDistribution = function(partyInputId) {

		var partyId = partyInputId.replace(/\_.+/,'');
		var amountChanged = inputElements[partyId].value - previousState[partyId];
		setPartyBarWidth(partyId, inputElements[partyId].value);
		var intended = amountChanged / (numberOfInputs - 1);

		var redistributionParties = [];
		for(var id in previousState){
			if((previousState[id] - intended) > MIN_AMOUNT && (previousState[id]  - intended) < MAX_AMOUNT){
				redistributionParties.push(id);
			}
		}

		var distribute = amountChanged / (redistributionParties.length - 1);

		// set the changed value to the state store
		previousState[partyId] = inputElements[partyId].value;

		for (var i in redistributionParties) {
			id = redistributionParties[i];
			if (partyId !== id) {
				var newVal = previousState[id] - distribute;
				newVal = Math.round(newVal * 10) / 10;
				if(newVal < 0){
					newVal = MIN_AMOUNT;
				}
				if(newVal > 100) {
					newVal = MAX_AMOUNT;
				}
				previousState[id] = newVal;
				inputElements[id].value = newVal;
				setPartyBarWidth(id, newVal);

			}
		}
	};

	ElectionProjector.prototype.convertToId = function(constituencyName) {
		return constituencyName.replace(/[\s,]/g,'_').replace(/&/g,'and').replace(/[()]/g,'');
	};

	ElectionProjector.prototype.loadData = function(url) {

		d3.json(url, function(constituencies) {
			seats = constituencies;
			for(var id in seats) {
				this.storeVotesPerConstituency(seats[id]);
				this.calculateSeatColor(seats[id]);
			}
		}.bind(this));
	};

	ElectionProjector.prototype.storeVotesPerConstituency = function(constituency) {

		// store in an adjusted variable as well
		for (var partyCode in constituency) {
			if (this.isValidPartyCode(partyCode)) {
				constituency[partyCode + '_adjusted'] = constituency[partyCode];
			}
		}

	};

	ElectionProjector.prototype.isValidPartyCode = function(partyCode) {
		return allParties.indexOf(partyCode) > -1;
	};

	ElectionProjector.prototype.calculateSeatColor = function(constituency) {
		var winner = {party:null, votes:0};

		var mapSeat = d3.select('#' + this.convertToId(constituency['Constituency Name']));

		for (var partyCode in constituency) {
			if (winner.votes < constituency[partyCode + '_adjusted'] && this.isValidPartyCode(partyCode)) {
				winner.party = partyCode;
				winner.votes = constituency[partyCode + '_adjusted'];
			}
		}

		this.setSeatColor(mapSeat, winner.party);
	};

	ElectionProjector.prototype.setSeatColor = function(ref, partyCode) {
		var newStyle = partyIds[partyCode]?partyIds[partyCode] + ' seat' : 'unknown seat';
		if(ref.node()){
			var isSelected = ref.attr('class').indexOf('selected') > -1;
			if(isSelected){
				newStyle += ' selected';
			}
			ref.attr('class', newStyle);
			if(isSelected){
				this.constituencyClickHandler.bind(ref[0][0])();
			}
		}
	};

	ElectionProjector.prototype.getPartyCodeById = function( id ) {
		for( var code in partyIds ) {
			if( partyIds.hasOwnProperty( code ) && partyIds[ code ] === id ) {
				return code;
			}
		}
		return 'other';
	};

	ElectionProjector.prototype.updateTotalNumberOfSeats = function(){
		var remaining = 650;
		var majority = 325;
		var resultDescription = 'Hung Parliament';
		var majorityPartyId = 'other'
		for (var partyId in previousState) {
			var elem = document.querySelector('.controls .party-row.' + partyId + ' .value');
			var adjustedSeatCount = document.querySelectorAll('svg g *.' + partyId + '.seat').length;
			if(adjustedSeatCount >= majority){
				resultDescription = partyFullnames[this.getPartyCodeById(partyId)] + ' Majority';
				majorityPartyId = partyId;
			}
			elem.innerHTML = adjustedSeatCount + ' Seats';
			remaining = remaining - adjustedSeatCount;
		}
		document.querySelector('.controls .party-row.' + 'other' + ' .value').innerHTML = remaining + ' Seats';

		winnerEl.className = 'winner ' + majorityPartyId;
		descriptionEl.innerHTML = resultDescription;
	};

	ElectionProjector.prototype.constituencyClickHandler = function() {

		selectedId = this.getAttribute('id');
		var selectedSeat = seats[selectedId];

		if(selectedSeat){
			detailEl.classList.remove('hidden');
			nameEl.innerHTML = "<h3>"+selectedSeat['Constituency Name']+"</h3>";
			tbodyEl.innerHTML = '';

			var votes = [];
			for(var i in selectedSeat){
				if(selectedSeat.hasOwnProperty(i) && i.indexOf('adjusted') > -1){
					votes.push(i);
				}
			}
			var sorted = votes.sort(function(a, b){
				return Number(selectedSeat[a]) <= Number(selectedSeat[b]);
			}).slice(0,5);

			for(var j in sorted){
				var partyId = sorted[j].substring(0, sorted[j].indexOf('adjusted') - 1) ;
				var partyClass = partyIds[partyId] || "other";
				tbodyEl.innerHTML += '<tr><td class="color"><div class="color '+partyClass.toLowerCase() +'">&nbsp;</div></td><td>' + (partyFullnames[partyId]||partyId) + '</td><td>' + selectedSeat[sorted[j]] + '</td></tr>';

			}
		} else {
			detailEl.classList.remove('hidden');
			console.log('No seat found for ' + selectedId);
		}

	};

	ElectionProjector.prototype.clearSelection = function(){
		detailEl.classList.add('hidden');
	};

	ElectionProjector.prototype.getConstituencyName = function(id){
		return seats[id]['Constituency Name'];
	};

	if(!window.ElectionProjector){
		window.ElectionProjector = ElectionProjector;
	}
	return ElectionProjector;
})();

