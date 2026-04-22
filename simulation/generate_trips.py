import sumolib
import random
import os

net_file = "nets/silkboard/silkboard.net.xml"
rou_file = "nets/silkboard/silkboard.rou.xml"

print(f"Loading network {net_file}...")
net = sumolib.net.readNet(net_file)
edges = [e for e in net.getEdges() if not e.isSpecial() and "internal" not in e.getFunction()]

print(f"Found {len(edges)} valid edges.")

vTypes = [
    '<vType id="car" accel="0.8" decel="4.5" sigma="0.5" length="5" minGap="2.5" maxSpeed="15"/>',
    '<vType id="truck" accel="0.4" decel="3.5" sigma="0.5" length="12" minGap="3.0" maxSpeed="10"/>',
    '<vType id="bus" accel="0.6" decel="4.0" sigma="0.5" length="10" minGap="3.0" maxSpeed="12"/>'
]

with open(rou_file, "w") as f:
    f.write("<routes>\n")
    for vt in vTypes:
        f.write(f"    {vt}\n")
    
    # Generate completely random heavy flows between edge pairs
    for i in range(100):
        e_from = random.choice(edges)
        e_to = random.choice(edges)
        while e_from == e_to:
            e_to = random.choice(edges)
            
        prob = random.uniform(0.05, 0.25)
        vtype = random.choices(["car", "truck", "bus"], weights=[0.7, 0.15, 0.15])[0]
        
        f.write(f'    <flow id="f_{i}" type="{vtype}" begin="0" end="3600" probability="{prob:.3f}" from="{e_from.getID()}" to="{e_to.getID()}"/>\n')
        
    f.write("</routes>\n")

print(f"Generated {rou_file} with 100 heavy flows.")
