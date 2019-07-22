const pwHash = '997dff24d4a4007a3f1023617ebf1f2586a06847ddde6000e010ccb25323244a'
const apiRoot = 'https://clarkoke.herokuapp.com/api/play?url='
Vue.use(VuePlyr)
var app = new Vue({
	el: '#app',
	data: {
		songList: [],
		songName: null,
		songURL: null,
		upvoteHistory: [],
		password: null,
		adminModeDialogActive: false,
		videoSource: '',
		playerObj: null,
		displayComputer: false
	},
	watch: {
		upvoteHistory: function (val) {
			localStorage.setItem('upvotes', JSON.stringify(val))
		},
		adminMode: function () {
			this.adminModeDialogActive = false
			if (this.songList.length > 0) {
				this.videoSource = apiRoot + this.songList[0].url + '&format=best'
			}
		}
	},
	computed: {
		adminMode: function () {
			return checkPassword(this.password)
		}
	},
	methods: {
		removeSong: function (idx) {
			this.songList.splice(idx, 1)
			syncToFirebase()
		},
		upvoteSong: function (idx) {
			if (this.upvoteHistory.includes(this.songList[idx].url)) {
				return
			}
			var newVotes = this.songList[idx].votes + 1
			var objCopy = Object.assign({}, this.songList[idx])
			objCopy.votes = newVotes
			Vue.set(app.songList, idx, objCopy)
			this.upvoteHistory.push(objCopy.url)
			syncToFirebase()
		},
		downvoteSong: function (idx) {
			if (!this.adminMode) {
				return
			}
			var newVotes = this.songList[idx].votes - 1
			var objCopy = Object.assign({}, this.songList[idx])
			objCopy.votes = newVotes
			Vue.set(app.songList, idx, objCopy)
			this.upvoteHistory.push(objCopy.url)
			syncToFirebase()
		},
		createNewSong: function () {
			if (this.songName !== null && this.songURL !== null && this.songName !== '' && this.songURL !== '') {
				newSong(this.songName, this.songURL)
				this.songName = ''
				this.songURL = ''
			}
		},
		toggleAdminDialog: function () {
			if (!this.adminMode) {
				this.adminModeDialogActive = !this.adminModeDialogActive
			}
		},
		disableAdminMode: function () {
			this.password = ''
		},
		nextTrack: function () {
			if (Array.isArray(this.songList) && this.songList.length > 0 && this.adminMode) {
				this.songList.shift()
				if (this.displayComputer) {
					syncToFirebase()
				}
				this.playerObj.source = {
					type: 'video',
					title: this.songList[0].name,
					sources: [
						{
							src: apiRoot + this.songList[0].url + '&format=best',
							type: 'video/mp4',
							size: 480
						}
					]
				}
				this.videoSource = this.songList[0].url
				this.playerObj.play()
			}
		},
		beginPlayback: function (o) {
			this.playerObj = o
			this.playerObj.on('ended', this.nextTrack.bind(this))
		}
	}
})

var database = firebase.database()

database.ref('/songs/').on('value', snapshot => {
	console.log('snapshot updated')
	var val = snapshot.val()
	if (val !== null) {
		val.sort(compareSongs)
	}
	app.songList = val
})

getUpvoteHistory()


function getUpvoteHistory() {
	if (localStorage.getItem('upvotes')) {
		app.upvoteHistory = JSON.parse(localStorage.getItem('upvotes'))
	}
}

function syncToFirebase() {
	if (app.songList !== null) {
		app.songList.sort(compareSongs)
	}
	database.ref('/songs/').set(app.songList)
}

function newSong(name, url) {
	// TODO: check if song exists
	var songList = []
	if (Array.isArray(app.songList)) {
		songList = app.songList.slice(0)
	}
	songList.push({
		name: name,
		url: url,
		votes: 1
	})
	songList.sort(compareSongs)
	return database.ref('/songs/').set(songList)
}


function compareSongs(a, b) {
	if (a.votes > b.votes)
		return -1;
	if (a.votes < b.votes)
		return 1;
	return 0;
}

function checkPassword(pwd) {
	var sha256 = new Hashes.SHA256
	if (sha256.hex(pwd) === pwHash) {
		return true
	}
	return false
}

function extractYoutubeID(url) {
	var urlTwo = ''
	if (url.indexOf('https://www.youtube.com/watch?v=') !== -1) {
		urlTwo = url.replace('https://www.youtube.com/watch?v=', '')
	} else {
		urlTwo = url.replace('https://youtu.be/', '')
	}
	return urlTwo
}