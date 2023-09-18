# Traceroute

## Information

Traceroute is used to trace the path between two connections/servers. This tool can be used to trace the path taken by tcp packets from your machine to the destination.

## How does it work

### Libraries used
1. raw_socket - This library is used to read the incoming ICMP packets from the routers in the path of the request.
2. dns-then - This library has been used to resolve the ip address of the given url and reverse lookup the host name from the ip address.
3. dgram - This has been used to send udp packets to the destination.
4. perf_hooks - This library has been used to measure the RTT of the packets.

### Methodology

There is no direct functionality provided by the routers to track the path between the source and the destination of the request. There can also be multiple paths taken at different times based on the traffic/congestion in the route between routers.

So we use the concept of ICMP packets to trace the path. When we send a packet to router, to avoid the packet to infinitely roam in between different routers, we send along TTL(Time to Live). Each router will decrease the value of TTL by one when it passes the packet to next router.

If the TTL becomes 0, that packet would be discarded by the router and an ICMP packet is sent to the host with the reason why packet was discarded. We will send UDP packets from the source machine to destination machine with TTL as 1,2,3 and so on until it reaches destination, or we reach maximum value of TTL(it can be defined by the user)
When we send TTL by 1, the first router will send us ICMP message of TTL limit exceeded, and we will get to know its ip address. we can then do reverse dns lookup to get its host name. We will send again with TTL as 2 and 3 and so on and we will get to know all the routers that received our request until we reach our destination.
We can get response from different routers if we run the program at different time as the path can be changed based by routers based on congestion in the network.


### Steps of the traceroute tool
1. We use dns-then to resolve the ip of the url.
2. We send UDP packet to the ip with TTL 1.
3. Our ICMP listener will listen to the incoming ICMP packet from the router and will store the ip address.
4. We will then send UDP packet to the destination with TTL as 2 and then again ICMP packet will come from the second router in the path.
5. This ip would again be stored along with the RTT.
6. Repeat steps of sending the UDP packet with increased TTL and listening to ICMP packets until you reach the destination or maximum number of hops.

We send three UDP packets for each TTL to get different RTT and to get values of different router ips in the way.