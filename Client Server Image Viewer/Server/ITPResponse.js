const e = require('express');
let fs = require('fs');


module.exports = {

    init: function(v, responseType, imageCount, timestamp, sequenceNumber, arrname, arrtype) { // feel free to add function parameters as needed
        //creating header buffers
        const buffer1 = Buffer.alloc(4);
        const buffer2 = Buffer.alloc(4);

        let f = 1;
        responseType = 1;

        //initializing empty buffers to store payload
        let finalpayload = Buffer.alloc(0);
        let payload = Buffer.alloc(0);

        //looping through the images and creating a payload for each one
        for(imageCount; imageCount > 0 ; imageCount--){
            let imagename = arrname[imageCount-1];
            let imagetype = arrtype[imageCount-1];
            payload = this.makePayload(imagename, imagetype);

            //if the image does not exist set fulfulled to 0
            if(!payload){
                f = 0;
                payload = Buffer.alloc(0)
            }
            //concatenating all image payloads into a final one
            finalpayload = Buffer.concat([finalpayload, payload]);   
        }  

       //creating header buffer
        temp1 = this.makeBinaryString(0, 7, 0);
        temp2 = this.makeBinaryString(temp1, f, 1);
        temp3 = this.makeBinaryString(temp2, responseType, 8);
        temp4 = this.makeBinaryString(temp3, arrname.length, 5);
        headertop = this.makeBinaryString(temp4,sequenceNumber,15);
        timestampB = this.makeBinaryString(0, timestamp, 0);

       // writing the integers to the header buffer
        buffer1.writeInt32BE(headertop);
        buffer2.writeInt32BE(timestampB);

        //adding the buffers to make the header
        let arr = [buffer1, buffer2];
        headerBuffer = Buffer.concat(arr);

       //creating a packet to send to the client
        packet = Buffer.concat([headerBuffer, finalpayload]);

        newheader = Buffer.alloc(4)
        length = Buffer.byteLength(packet);
        newheader.writeInt32BE(length);
        this.packet = Buffer.concat([newheader, packet])

    },

    makePayload: function(imagename, imagetype){
        //creating a path to the image
        imagetype = imagetype.toString().toLowerCase();
        imagename = imagename.charAt(0).toUpperCase() + imagename.slice(1)
        let path = './images/' + imagename + "." + imagetype;
        try{
            let imageInfoBuffer = Buffer.alloc(4);
       
            //geting the file size
            let imgfile = fs.statSync(path);
            imgfilesize = imgfile.size;
      
            //getting the image type in decimal
            if (imagetype == "bmp"){ binaryImgTyp = 1; }
            else if (imagetype == "jpeg"){ binaryImgTyp = 2; }
            else if (imagetype == "gif"){ binaryImgTyp = 3; }
            else if (imagetype == "png"){ binaryImgTyp = 4; }
            else if (imagetype == "tiff"){ binaryImgTyp = 5; }
            else if(imagetype == "raw"){binaryImgTyp = 15; }

            //getting the size of the image name
            let imgnamesize = Buffer.byteLength(imagename);
            let imageFileNameBuffer = Buffer.alloc(imgnamesize);
            let imageData = Buffer.alloc(imgfilesize)
     
            //adding the image info into the first buffer
            let temp1 = this.makeBinaryString( 0 ,binaryImgTyp, 0)
            let temp2 = this.makeBinaryString(temp1, imgnamesize, 12)
            let final = this.makeBinaryString(temp2, imgfilesize, 16)

            //creating the first 2 buffers
            imageInfoBuffer.writeInt32BE(final);
            imageFileNameBuffer.write(imagename, 'ascii');

            //getting the image data
            imageData = fs.readFileSync(path);

            //adding to the payload buffer
            payloadlength = imageInfoBuffer.length + imageFileNameBuffer.length + imageData.length ;
            payload = Buffer.concat([imageInfoBuffer, imageFileNameBuffer, imageData], payloadlength)

            return payload;

        }catch(e){
            console.log(e)
            console.log('Does not exist');
            return 0;
        }
    },


      //using bitwise operations to add values 
    makeBinaryString: function(prevval, newval, bitShift){
        let shiftedval = prevval << bitShift;
        let input = shiftedval | newval;
        return input
    },
   
   
    getPacket: function() {
        return this.packet
    },

};

