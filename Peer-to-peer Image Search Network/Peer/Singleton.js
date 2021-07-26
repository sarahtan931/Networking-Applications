
module.exports = {
    init: function() {
       // initializing variables
        this.timer = Math.floor((Math.random() * 999) + 1);
        this.peertable = [];
        this.recentSearches = [];
        this.length = 0;
        this.sequenceNumber = Math.floor((Math.random() * 999) + 1);
        this.senderid = '';
        this.host = '';
        this.peersenderid = '';
        this.peerhost = '';
        this.portImage = 0;
        this.imagesFound = [];
        this.typeFound = [];

        //incrementing counter every 10 ms
        setInterval(() => this.tick(), 10);
    },

    tick: function(){  //function to increment counter
        if (this.timer >= 4294967296){
            this.timer = 0;
        }else{
            this.timer = this.timer + 1;
        }
    },

    getSequenceNumber: function() {  //function to get sequence number
        this.sequenceNumber = this.sequenceNumber + 1
        return this.sequenceNumber ;
    },

    getTimestamp: function() { //function to get the timestamp
        return this.timer;
    },

    addPeerTable: function(HOST, PORT, sock){  //adding a new peer to the peer table
        this.peertable.push({
            'HOST': HOST,
            'PORT': PORT,
            'SOCK': sock
        });
    },

    getPeerTable: function(){   //function to return the peer table
        return this.peertable;
    },

    setSenderInfo: function(senderid, host, port){ //function to set sender info
        this.senderid = senderid
        this.host = host
        this.port = port
    },

    setPeerPort: function(port){ //function to set peer port
        this.peerport = port
    },

    getPeerPort: function(){ //function to get peer port
        return this.peerport
    },

    setImagePort: function(port){ //function to set image db port
        this.portImage = port
    },

    getSenderId: function(){ //function to get sender info
        return this.senderid;
    },

    getHost: function(){ //function to get host
        return this.senderid;
    },

    getImagePort: function(){ //function to get image port
        return this.portImage;
    },

    setRecentSearches: function(search){ //function to set recent searches in a circular way
        this.recentSearches.push(search);
        if (this.recentSearches.length > this.peertable.length){
            this.recentSearches.shift();
        }
    },
    
    getRecentSearches: function(){ //function to get recent searches
        return this.recentSearches;
    },

    setImagesFound: function(image){ //function to save images found
        image = image.toLowerCase();
        if (!this.imagesFound.includes(image)){
            this.imagesFound.push(image);
        }
    },

    getImagesFound: function(){ //function to get images found
        return this.imagesFound;
    },

    clearImageHistory: function(){ //function to clear images found
        this.imagesFound = [];
        this.typeFound = [];
    },

    setTypeFound: function(type){ //function to set the type of images found
        type = type.toLowerCase();
        if (this.imagesFound.length > this.typeFound.length){
        this.typeFound.push(type);
        }
    },

    getTypeFound: function(){ //function to get type of images found
        return this.typeFound;
    }
};