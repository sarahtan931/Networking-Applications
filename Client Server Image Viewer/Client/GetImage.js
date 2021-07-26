//importing all required libraries
let Net = require("net");
let fs = require("fs");
let open = require("open");
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

let ITPpacket = require("./ITPRequest"); 

const client = new Net.Socket();

//getting command line inputs from user
let connectData = argv.s.split(':');
let host = connectData[0];
let port = connectData[1];
let version = argv.v;

//getting image names from command line
let imgarray = []
for (i of process.argv){
  if (i.includes('gif') || i.includes('jpeg'))
  imgarray.push(i)
}

//calculating image count
let imgCount = imgarray.length;

//connecting to the server 
client.connect({ port: port, host: host }, function() {
    console.log('Connected to ImageDB server on:', host, ':', port);
    //initializing and sending ITP request to server
    ITPpacket.init(version, imgCount, 0, imgarray);
    let request = ITPpacket.getBytePacket();
    client.write(request);

});

//allocating buffer for data from server
let alldata = Buffer.alloc(0);

client.on('data', function(data) {

  //wait for all data to be received then read packet
  alldata = Buffer.concat([alldata, data]);
  let sizebuffer = alldata.readInt32BE(0);
 
  if ((sizebuffer-4) <= (Buffer.byteLength(alldata))){
    toRead = alldata.slice(4, sizebuffer)
    convertData(toRead)
  }
});

//function to decode packet sent from server
function convertData(data){
   let binarystring = "";

   datasize = Buffer.byteLength(data);
   readBuffer = Uint8Array.from(data);

   //reading the data into a binary string
   for (let i=0; i < datasize; i++){
      read = readBuffer[i];
      binarystringtemp = read.toString(2).padStart(8, "0");
      binarystring = binarystring + binarystringtemp;
   }
 
   //printing the packet header
    let printstring = binarystring.substring(0,64);
    printstring = printstring.match(/.{1,8}/g).join(" "); 
 
    //parsing the header 
    v = parseInt(binarystring.substring(0,3), 2);
    f = parseInt(binarystring.substring(3,4), 2);
    rt = parseInt(binarystring.substring(4,12), 2);
    ic = parseInt(binarystring.substring(12, 17), 2);
    sn = parseInt(binarystring.substring(17, 32), 2);
    ts = parseInt(binarystring.substring(32, 64), 2);

    //converting data into strings 
    if(rt == 1){ rtString = "Found";}
    
    if(f == 1){fstring = "Yes" }
      else{ 
       fString = "No"
       rtString = "Not Found" 
      }

    //printing out decoded header to the user
    console.log('\nITP packet header recieved: \n',printstring,);
    console.log('\nServer sent: ');
    console.log('--ITP version =', v);
    console.log('--Fulfilled =', fstring);
    console.log('--ResponseType = ', rt);
    console.log('--Image Count = ', ic);
    console.log('--Sequence Number =', sn);
    console.log('--Timestamp =', ts);

    //looping through the image payloads
    let newstart = 64;
    for (i = 0; i < ic; i++){
      //getting the payload information
      imagetype = parseInt(binarystring.substring(newstart, newstart+4), 2);
      filenamesize = parseInt(binarystring.substring(newstart+4, newstart+16), 2);
      imagesize = parseInt(binarystring.substring(newstart + 16, newstart + 32), 2);

      let headerTop = newstart + 32;

      //converting the payload information into strings
      if (imagetype == 1){typestring = "BMP"}
      else if (imagetype == 2){typestring = "JPEG"}
      else if (imagetype == 3){typestring = "GIF"}
      else if (imagetype == 4){typestring = "PNG"}
      else if (imagetype == 4){typestring = "TIFF"}
      else if (imagetype == 15){typestring = "RAW"}

     let imgname = "";
     let endofFileName = headerTop + filenamesize*8;

     //looping through file name to decode the ascii string
     for (j = headerTop; j < endofFileName; j = j+8){
      let charb = binarystring.substring(j, j+8)
      imgname = imgname+ String.fromCharCode(parseInt(charb, 2));
      }

      newstart = endofFileName + imagesize*8;
     
      //slicing the image buffer from the total buffer
      let img = data.slice(endofFileName/8, newstart/8)
      
      //getting the file name 
      typestring = typestring.toLowerCase();
      let imgnamefile = imgname + '.' + typestring;
     
      //writes a file to the file name and opens it
      fs.writeFileSync(imgnamefile, img);
      fs.openSync(imgnamefile)
    }
}


client.on('error', function(){
  console.log('Disconnected from the server \nConnection closed');
  client.destroy()
})

