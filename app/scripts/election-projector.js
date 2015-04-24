(function(){
	'use strict';
	var MAX_AMOUNT = 99;
	var MIN_AMOUNT = 1;

	var seats;
	var selectedId = null;
	var tableEl = document.querySelector('.detail table');
	var nameEl = tableEl.querySelector('th');
	var tbodyEl = tableEl.querySelector('tbody');

	var inputElements = [];
	var barElements = [];

	function setPartyBarWidth(party, width){
		barElements[party].style.width = width + '%';
	}

	function ElectionProjector() {

		this.visibleParties = ["Con","Lab","LD"];

		this.twentyTenPercentageResult = {'con':36.1,'lab':29.1,'libdem':23.0,'other':11.9};
		this.previousPercentageState = {};

		for (var party in this.twentyTenPercentageResult) {
			inputElements[party] = document.getElementById(party + '_rangeinput');
			barElements[party] = document.querySelector('.controls .party-row.' + party + ' .progress-bar');
		}

	}

	ElectionProjector.prototype.initialise = function(){
		this.loadData();
		this.setTwentyTenResults();
		this.updateTotalNumberOfSeats();

	};

	ElectionProjector.prototype.setProjection = function(projectedValues){
		for (var party in projectedValues) {
			this.previousPercentageState[party] = inputElements[party].value = projectedValues[party];
			setPartyBarWidth(party, projectedValues[party]);
		}
	};

	ElectionProjector.prototype.resetPercentages = function(){
		this.setTwentyTenResults();
		this.updateVotes();
		this.updateTotalNumberOfSeats();
	};

	ElectionProjector.prototype.setTwentyTenResults = function() {
		this.setProjection(this.twentyTenPercentageResult);
	};

	ElectionProjector.prototype.recalculateSeats = function(node) {

		this.reCalculateTo100percent(node.id);

		this.updateVotes();
		this.updateTotalNumberOfSeats();

	};

	ElectionProjector.prototype.updateVotes = function() {
		var voteDiffs = {};

		for (var party in this.twentyTenPercentageResult) {
			voteDiffs[this.partyCodeLookup(party)] = (Number(this.previousPercentageState[party]) / Number(this.twentyTenPercentageResult[party]) ) ;
		}

		var otherParties = this.getOtherParties();

		for (var i = 0; i < otherParties.length; i++) {
			voteDiffs[otherParties[i]] = voteDiffs.other;
		}

		delete voteDiffs.other; // not a valid party anymore

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

	ElectionProjector.prototype.getOtherParties = function() {
		var allParties = ["AC","AD","AGS","APNI","APP","AWL","AWP","BB","BCP","Bean","Best","BGPV","BIB","BIC","Blue","BNP","BP Elvis","C28","Cam Soc","CG","Ch M","Ch P","CIP","CITY","CNPG","Comm","Comm L","Con","Cor D","CPA","CSP","CTDP","CURE","D Lab","D Nat","DDP","DUP","ED","EIP","EPA","FAWG","FDP","FFR","Grn","GSOT","Hum","ICHC","IEAC","IFED","ILEU","Impact","Ind1","Ind2","Ind3","Ind4","Ind5","IPT","ISGB","ISQM","IUK","IVH","IZB","JAC","Joy","JP","Lab","Land","LD","Lib","Libert","LIND","LLPB","LTT","MACI","MCP","MEDI","MEP","MIF","MK","MPEA","MRLP","MRP","Nat Lib","NCDV","ND","New","NF","NFP","NICF","Nobody","NSPS","PBP","PC","Pirate","PNDP","Poet","PPBF","PPE","PPNV","Reform","Respect","Rest","RRG","RTBP","SACL","Sci","SDLP","SEP","SF","SIG","SJP","SKGP","SMA","SMRA","SNP","Soc","Soc Alt","Soc Dem","Soc Lab","South","Speaker","SSP","TF","TOC","Trust","TUSC","TUV","UCUNF","UKIP","UPS","UV","VCCA","Vote","Wessex Reg","WRP","You","Youth","YRDPL"];
		return allParties.filter(function(item){
			return this.visibleParties.indexOf(item) === -1;
		}.bind(this));
	};

	ElectionProjector.prototype.reCalculateTo100percent = function(partyChanged) {

		partyChanged = partyChanged.replace(/\_.+/,'');
		var amountChanged = inputElements[partyChanged].value - this.previousPercentageState[partyChanged];

		var intended = amountChanged / this.visibleParties.length;

		var redistributionParties = [];
		for(var party in this.previousPercentageState){
			if((this.previousPercentageState[party] - intended) > MIN_AMOUNT && (this.previousPercentageState[party]  - intended) < MAX_AMOUNT){
				redistributionParties.push(party);
			}
		}

		var distribute = amountChanged / (redistributionParties.length - 1);

		// set the changed value to the state store
		this.previousPercentageState[partyChanged] = inputElements[partyChanged].value;

		for (var i in redistributionParties) {
			party = redistributionParties[i];
			if (partyChanged !== party) {
				var newVal = this.previousPercentageState[party] - distribute;
				newVal = Math.round(newVal * 10) / 10;
				if(newVal < 0){
					newVal = MIN_AMOUNT;
				}
				if(newVal > 100) {
					newVal = MAX_AMOUNT;
				}
				this.previousPercentageState[party] = newVal;
				inputElements[party].value = newVal;
				setPartyBarWidth(party, newVal);

			}
		}
	};

	ElectionProjector.prototype.convertToId = function(constituencyName) {
		return constituencyName.replace(/[\s,]/g,'_').replace(/&/g,'and').replace(/[()]/g,'');
	};

	ElectionProjector.prototype.loadData = function() {

		d3.json("data/2010.json", function(constituencies) {
			seats = constituencies;
			for(var id in seats) {
				this.storeVotesPerConstituency(seats[id]);
				this.calculateSeatColor(seats[id]);
			}
		}.bind(this));
	};

	ElectionProjector.prototype.storeVotesPerConstituency = function(constituency) {

		// store in an adjusted variable as well
		for (var party in constituency) {
			if (this.isValidParty(party)) {
				constituency[party + '_adjusted'] = constituency[party];
			}
		}

	};

	ElectionProjector.prototype.isValidParty = function(party) {
		var notValidParties = ['Press Association Reference','Constituency Name','Region','Election Year','Electorate','Votes'];
		return notValidParties.indexOf(party) === -1;
	};

	ElectionProjector.prototype.calculateSeatColor = function(constituency) {
		var winner = {party:null, votes:0};

		var mapSeat = d3.select('#' + this.convertToId(constituency['Constituency Name']));

		for (var party in constituency) {
			if (winner.votes < constituency[party + '_adjusted'] && this.isValidParty(party)) {
				winner.party = party;
				winner.votes = constituency[party + '_adjusted'];
			}
		}

		this.setSeatColor(mapSeat, winner.party);
		//mapSeat.on('click',this.constituencyClickHandler);
	};

	ElectionProjector.prototype.setSeatColor = function(ref, party) {
		var style = this.setStyle(party);
		ref.attr('class', style + ' seat');
	};

	ElectionProjector.prototype.partyCodeLookup = function(party) {
		switch (party) {
		case 'con':
			return 'Con';
		case 'lab':
			return 'Lab';
		case 'libdem':
			return 'LD';
		default:
			return 'other';
		}
	};

	ElectionProjector.prototype.lookupSVGStyle = function(inputId){
		switch (inputId) {
		case 'con':
			return 'tory';
		case 'lab':
			return 'labour';
		case 'libdem':
			return 'libdem';
		default:
			return 'other';
		}
	};

	ElectionProjector.prototype.updateTotalNumberOfSeats = function(){
		var remaining = 650;
		for (var party in this.previousPercentageState) {
			var elem = document.querySelector('.controls .party-row.' + party + ' .value');
			var adjustedSeatCount = document.querySelectorAll('svg g *.' + this.lookupSVGStyle(party) + '.seat').length;
			elem.innerHTML = adjustedSeatCount;
			remaining = remaining - adjustedSeatCount;
		}
		document.querySelector('.controls .party-row.' + party + ' .value').innerHTML = remaining;
	};

	ElectionProjector.prototype.setStyle = function(party) {
		var styles = {'Lab':'labour','Con':'tory','LD':'libdem','SNP':'snp','Grn':'green','Respect':'respect','SDLP':'sdlp','PC':'pc','DUP':'dup','UUP':'uup','SF':'sf','UKIP':'ukip'};
		return styles?styles[party] : 'unknown';
	};

	ElectionProjector.prototype.constituencyClickHandler = function() {

		selectedId = this.getAttribute('id');
		var selectedSeat = seats[selectedId];

		if(selectedSeat){
			tableEl.classList.remove('hidden');
			nameEl.innerHTML = selectedSeat['Constituency Name'];
			tbodyEl.innerHTML = '';

			var votes = [];
			for(var i in selectedSeat){
				if(selectedSeat.hasOwnProperty(i) && i.indexOf('adjusted') > -1){
					votes.push(i);
				}
			}
			var sorted = votes.sort(function(a, b){
				return selectedSeat[a] <= selectedSeat[b];
			});

			for(var j in sorted){
				tbodyEl.innerHTML += '<tr><td>' + sorted[j].substring(0, sorted[j].indexOf('adjusted') - 1) + '</td><td>' + selectedSeat[sorted[j]] + '</td></tr>';
			}
		} else {
			console.log('No seat found for ' + selectedId);
		}

	};

	ElectionProjector.prototype.clearSelection = function(){
		tableEl.classList.add('hidden');
	};

	if(!window.ElectionProjector){
		window.ElectionProjector = ElectionProjector;
	}
	return ElectionProjector;
})();

