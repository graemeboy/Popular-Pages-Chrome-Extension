var linkTally = {};
var linksFinal = {};
var titlesIndex = {};
var links = new Array();
var sortedData = new Array();
var topTen = new Array();
var shareData = {};
var networkLocation = '';
var protocol = '';
var rootlink;

function formatLink(link) {
	// defrag
	link = link.split('#')[0];
	if (link.substr(0, 4) != 'http') {
		// relative path. add protocol and network location
		if (link.charAt(0) != '/') {
			link = '/' + link;
		}
		link = protocol + '//' + networkLocation + link;
	}
	if (link.substr(link.length - 1) == '/') {
		// dangling slash
		link = link.substr(0, link.length - 1);
	}
	return link;
}

function getLinksYahoo(depth) {
	if (depth < 5) {
		url = links[depth];
		var yahooURL = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22" + encodeURI(url) + "%22%20and%0A%20%20%20%20%20%20xpath%3D'%2F%2Fa'&diagnostics=true&format=json";
		$.ajax({
			url: yahooURL,
			dataType: 'json',
			success: function(data) {
				if (data.query.results) {
					$.each(data.query.results.a, function(index) {
						if (data.query.results.a[index].href != undefined && data.query.results.a[index].href.substr(0, 10) != 'javascript') {
							link = data.query.results.a[index].href;
							link = formatLink(link);
							if (linkTally[link] == undefined && ((link.substring(0, protocol.length + networkLocation.length + 2) == (protocol + '//' + networkLocation) || link.substring(0, protocol.length + networkLocation.length + 6) == (protocol + '//www.' + networkLocation)) && link.substring(link.length - 4, link.length) != '.jpg' && link.substring(link.length - 4, link.length) != '.png' && link.substring(link.length - 4, link.length) != '.mp3' && link.substring(link.length - 4, link.length) != '.mp4' && link.substring(link.length - 4, link.length) != '.pdf')) {
								if (data.query.results.a[index].title) {
									titlesIndex[link] = data.query.results.a[index].title;
								}
								addLinkToList(link);
							}
						}
					});
				}
				$('#links-found').html(links.length);
				getLinksYahoo(depth + 1);
			}
		});
	} else {
		getFacebookShares(0);
	}
}

function getFacebookShares(count) {
	if (count < links.length) {
		socUrl = 'http://urls.api.twitter.com/1/urls/count.json?url=' + links[count];
		$.ajax({
			url: socUrl,
			dataType: 'json',
			complete: function(data) {
				data = $.parseJSON(data.responseText);
				if (data.count !== undefined) {
					shareData[links[count]] = data.count;
				}
				getFacebookShares(count + 1);
			}
		});
	} else {
		sortData();
	}
}

function sortData() {
	for (var shares in shareData) {
		sortedData.push([shares, shareData[shares]])
	}
	sortedData.sort(function(a, b) {
		return b[1] - a[1];
	});
	topTen = sortedData.slice(0, 10);
	$('#progress-info').html('Ordering pages according to popularity');
	$('#link-progress').show();
	addTopTenToDom(0);
}

function addTopTenToDom(count) {
	if (count < topTen.length) {
		var link = topTen[count][0];
		if (titlesIndex[link] == undefined) {
			var linkTitle = link;
			var yahooURL = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22" + encodeURI(link) + "%22%20and%0A%20%20%20%20%20%20xpath%3D'%2F%2Ftitle'&diagnostics=true&format=json";
			$.ajax({
				url: yahooURL,
				dataType: 'json',
				complete: function(data) {
					data = $.parseJSON(data.responseText);
					if (data.query.results && data.query.results.title !== undefined) {
						linkTitle = data.query.results.title;
					} // if results
					linksFinal[link] = linkTitle;
					$('#link-progress-bar').css('width', ((count + 1) * 10) + '%');
					addTopTenToDom(count + 1);
				} // success
			}); // ajax
		} else {
			linksFinal[link] = titlesIndex[link];
			addTopTenToDom(count + 1);
		}
	} // if (count ... )
	else {
		$('#link-progress').hide();
		$('#progress-info').html('Data mining complete');
		var Site = Parse.Object.extend("Site");
		var newSite = new Site();
		newSite.save({
			root: rootlink,
			linkData: JSON.stringify(linksFinal)
		});
		addFinal();
	} // else
}

function addFinal() {
	$('#progress-info').hide();
	$.each(linksFinal, function(url, title) {
		$('#link-area').append('<li class="topTenItem"><a href="' + url + '">' + title + '</a></li>');
	}); // for each in linksFinal
}

function addLinkToList(urlIn) {
	linkTally[urlIn] = true;
	links.push(urlIn);
}
jQuery(document).ready(function($) {
	Parse.initialize("LUjvydZdeivH3Rs70mlvxeZ2vPZZo92F4fqiZZz9", "1JPEjFCOfJMaSI0YUbSP9SG0tCpTJWVc2b5t1K6A");
	chrome.tabs.query({
		'active': true,
		'windowId': chrome.windows.WINDOW_ID_CURRENT
	}, function(tabs) {
		var linkIn = tabs[0].url;
		var el = document.createElement('a');
		el.href = linkIn;
		networkLocation = el.hostname;
		protocol = el.protocol;
		rootlink = protocol + '//' + networkLocation;
		$('#root-link').html(rootlink);

		var Site = Parse.Object.extend("Site");
		var query = new Parse.Query(Site);
		query.equalTo("root", rootlink);
		query.find({
			success: function(results) {
				if (results.length > 0) {
					var object = results[0];
					linksFinal = $.parseJSON(object.get('linkData'));
					addFinal();
				} else {
					addLinkToList(formatLink(rootlink));
					getLinksYahoo(0);
				}
			}
		});
		
	});
});