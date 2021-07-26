
module.exports = {
    init: function() {
       // initializing variables
        this.timer = Math.floor((Math.random() * 999) + 1);
        this.peertable = [];
        this.length = 0;
        this.sequenceNumber = Math.floor((Math.random() * 999) + 1);
        //incrementing counter every 10 ms
        setInterval(() => this.tick(), 10);
    },

    //function to increment counter
    tick: function(){
        if (this.timer >= 4294967296){
            this.timer = 0;
        }else{
            this.timer = this.timer + 1;
        }
    },

    getSequenceNumber: function() {
        this.sequenceNumber = this.sequenceNumber + 1
        return this.sequenceNumber ;
    },

    getTimestamp: function() {
        return this.timer;
    },

    //adding a new peer to the peer table
    addPeerTable: function(HOST, PORT){
        this.peertable.push({
            'HOST': HOST,
            'PORT': PORT
        });
    },

    //returning the peer table
    getPeerTable: function(){
        return this.peertable;
    },
};