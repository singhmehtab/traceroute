const raw_socket = require('raw-socket');
const dns_resolver = require('dns-then');
const dgram = require('dgram');
const {performance} = require('perf_hooks');

let MAX_HOPS = 64;
let host = 'www.instagram.com';
let port = 33435;
let TTL = 1;
let PACKET_NUMBER = 0;
let startTime = performance.now();
let traceMap = new Map();
let traceHost = new Map();

let icmpResponseTimeout;

function getTimeElapsed(){
    let endTime = performance.now();
    let timeDiff = endTime - startTime; //in ms
    return Math.round(timeDiff);
}

// this might not work on windows due to windows settings.
const icmpSocket = raw_socket.createSocket({ protocol: raw_socket.Protocol.ICMP
    , addressFamily: raw_socket.AddressFamily.IPv4
});


const message = Buffer.from("Hello")
let ipAddress;
getIp(host).then((value)=> {
        ipAddress = value;
        console.log("traceroute to " + ipAddress[0] + " : " + "max " + MAX_HOPS);
        sendUdpMessage();
    }
);


icmpSocket.on('message', async function (buffer, source) {
    const offset = 20;
    const msgType = buffer.readUInt8(offset);
    const msgCode = buffer.readUInt8(offset + 1);
    // condition to check the type of icmp response
    // Find more information here - > https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml
    if ((msgType === 11 && msgCode === 0) ||
    (msgType === 3 && msgCode === 3)) {
        await printTraceAndSendMessage(source);
    }
})

async function printTraceAndSendMessage(responseSource){
    if(TTL > MAX_HOPS) {
        console.log("Quitting Traceroute. Max Hops of " + MAX_HOPS + " exceeded");
        process.exit(0)
    }
    if(icmpResponseTimeout) clearTimeout(icmpResponseTimeout);
    if(!traceMap.has(TTL)) traceMap.set(TTL, []);
    if(!responseSource){
        traceMap.get(TTL).push(" * ");
    }
    else {
        let middleHost = (await reverseDns(responseSource))
        if(middleHost === "") middleHost = responseSource;
        let elapsedTime = getTimeElapsed();
        if(!traceHost.has(TTL)) {
           traceHost.set(TTL, middleHost);
           traceMap.get(TTL).push(middleHost + " ( " + responseSource + " ) " );
        }
        if(traceHost.get(TTL) === middleHost){
            traceMap.get(TTL).push(" " + elapsedTime + " ");
        }
        else{
            traceMap.get(TTL).push((middleHost + " ( " + responseSource + " ) " + elapsedTime) + " ");
        }
    }
    if(PACKET_NUMBER >= 3){
        let finalTrace = "";
        const traceArray = traceMap.get(TTL);
        for(let i= 0;i<traceArray.length;i++){
            finalTrace += traceArray[i];
        }
        console.log(finalTrace);
    }
    if(responseSource === ipAddress[0] && PACKET_NUMBER >= 3){
        console.log("traceroute complete");
        process.exit(0);
    }
    await sendUdpMessage();
}

function sendUdpMessage(){
    PACKET_NUMBER++;
    if(PACKET_NUMBER > 3) {
        TTL = TTL + 1;
        PACKET_NUMBER = 1;
    }
    const udpSocket = dgram.createSocket('udp4');
    udpSocket.bind( () => {
        udpSocket.setTTL(TTL);
    })
    startTime = performance.now();
    udpSocket.send(message,0, message.length, port++, ipAddress[0], function (err, bytes){
        if(err){
            console.log("Error in Udp -> " + err);
        }
    });
    icmpResponseTimeout = setTimeout(printTraceAndSendMessage, 1000);
}

function getIp(host){
    return new Promise(resolve => {
        dns_resolver.resolve(host, function (err, address) {
            if(err) throw err;
            resolve(address);
        })
    })
}

async function reverseDns(ip){
    return new Promise(resolve => {
        dns_resolver.reverse(ip, (err, hostNames)=>{
            if(err) {
                resolve("");
            }
            let hostname = hostNames[0];
            for(let i=1;i<hostNames.length;i++){
                if(hostNames[i].length < hostname.length){
                    hostname = hostNames[i];
                }
            }
            resolve(hostname);
        })
    })
}

