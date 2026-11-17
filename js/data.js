// Hand-written reference data: airports, airline hubs, and airport-to-venue transit notes.
// Transit levels: 4 train to the door, 3 easy transit, 2 doable (a bus, a transfer, or a short rideshare), 1 plan on a car.

// code: [name, lat, lon, time zone]
export const AIRPORTS = {
  ABE:['Lehigh Valley',40.652,-75.440,'America/New_York'], ABQ:['Albuquerque',35.040,-106.609,'America/Denver'],
  ANC:['Anchorage',61.174,-149.996,'America/Anchorage'], ATL:['Atlanta',33.641,-84.427,'America/New_York'],
  AUS:['Austin',30.194,-97.670,'America/Chicago'], AVP:['Wilkes-Barre/Scranton',41.338,-75.723,'America/New_York'],
  BDL:['Hartford Bradley',41.939,-72.683,'America/New_York'], BNA:['Nashville',36.126,-86.677,'America/Chicago'],
  BOS:['Boston Logan',42.365,-71.010,'America/New_York'], BUF:['Buffalo Niagara',42.940,-78.732,'America/New_York'],
  BUR:['Hollywood Burbank',34.200,-118.359,'America/Los_Angeles'], BWI:['Baltimore/Washington',39.175,-76.668,'America/New_York'],
  CHS:['Charleston',32.899,-80.040,'America/New_York'], CLE:['Cleveland Hopkins',41.412,-81.850,'America/New_York'],
  CLT:['Charlotte Douglas',35.214,-80.943,'America/New_York'], CMH:['Columbus',39.998,-82.892,'America/New_York'],
  CVG:['Cincinnati/Northern Kentucky',39.049,-84.668,'America/New_York'], DAL:['Dallas Love Field',32.847,-96.852,'America/Chicago'],
  DCA:['Washington National',38.852,-77.038,'America/New_York'], DEN:['Denver',39.856,-104.674,'America/Denver'],
  DFW:['Dallas Fort Worth',32.900,-97.040,'America/Chicago'], DSM:['Des Moines',41.534,-93.663,'America/Chicago'],
  DTW:['Detroit Metro',42.212,-83.353,'America/Detroit'], ELP:['El Paso',31.807,-106.378,'America/Denver'],
  EWR:['Newark Liberty',40.690,-74.175,'America/New_York'], FLL:['Fort Lauderdale',26.073,-80.153,'America/New_York'],
  GRR:['Grand Rapids',42.881,-85.523,'America/Detroit'], HNL:['Honolulu',21.319,-157.922,'Pacific/Honolulu'],
  HOU:['Houston Hobby',29.645,-95.279,'America/Chicago'], IAD:['Washington Dulles',38.953,-77.457,'America/New_York'],
  IAH:['Houston Bush Intercontinental',29.990,-95.337,'America/Chicago'], IND:['Indianapolis',39.717,-86.294,'America/Indiana/Indianapolis'],
  JAX:['Jacksonville',30.494,-81.688,'America/New_York'], JFK:['New York JFK',40.641,-73.778,'America/New_York'],
  LAS:['Las Vegas',36.084,-115.154,'America/Los_Angeles'], LAX:['Los Angeles',33.942,-118.409,'America/Los_Angeles'],
  LGA:['New York LaGuardia',40.777,-73.874,'America/New_York'], MCI:['Kansas City',39.298,-94.714,'America/Chicago'],
  MCO:['Orlando',28.431,-81.308,'America/New_York'], MDW:['Chicago Midway',41.786,-87.752,'America/Chicago'],
  MEM:['Memphis',35.042,-89.977,'America/Chicago'], MIA:['Miami',25.796,-80.287,'America/New_York'],
  MKE:['Milwaukee Mitchell',42.947,-87.897,'America/Chicago'], MSP:['Minneapolis-St. Paul',44.885,-93.222,'America/Chicago'],
  MSY:['New Orleans',29.993,-90.258,'America/Chicago'], OAK:['Oakland',37.721,-122.221,'America/Los_Angeles'],
  OKC:['Oklahoma City',35.393,-97.601,'America/Chicago'], OMA:['Omaha',41.303,-95.894,'America/Chicago'],
  ORD:["Chicago O'Hare",41.978,-87.905,'America/Chicago'], ORF:['Norfolk',36.895,-76.201,'America/New_York'],
  PDX:['Portland',45.589,-122.597,'America/Los_Angeles'], PHL:['Philadelphia',39.872,-75.241,'America/New_York'],
  PHX:['Phoenix Sky Harbor',33.435,-112.010,'America/Phoenix'], PIE:['St. Pete-Clearwater',27.910,-82.687,'America/New_York'],
  PIT:['Pittsburgh',40.492,-80.233,'America/New_York'], RDU:['Raleigh-Durham',35.878,-78.787,'America/New_York'],
  RIC:['Richmond',37.505,-77.320,'America/New_York'], RNO:['Reno-Tahoe',39.499,-119.768,'America/Los_Angeles'],
  ROC:['Rochester',43.119,-77.672,'America/New_York'], RSW:['Fort Myers',26.536,-81.755,'America/New_York'],
  SAN:['San Diego',32.734,-117.190,'America/Los_Angeles'], SAT:['San Antonio',29.534,-98.470,'America/Chicago'],
  SDF:['Louisville',38.174,-85.736,'America/Kentucky/Louisville'], SEA:['Seattle-Tacoma',47.449,-122.309,'America/Los_Angeles'],
  SFO:['San Francisco',37.619,-122.375,'America/Los_Angeles'], SJC:['San Jose',37.363,-121.929,'America/Los_Angeles'],
  SLC:['Salt Lake City',40.790,-111.979,'America/Denver'], SMF:['Sacramento',38.695,-121.591,'America/Los_Angeles'],
  SNA:['Orange County John Wayne',33.676,-117.868,'America/Los_Angeles'], STL:['St. Louis Lambert',38.749,-90.370,'America/Chicago'],
  SYR:['Syracuse',43.111,-76.106,'America/New_York'], TPA:['Tampa',27.976,-82.533,'America/New_York'],
  TUL:['Tulsa',36.198,-95.888,'America/Chicago'], TUS:['Tucson',32.116,-110.941,'America/Phoenix'],
  YEG:['Edmonton',53.310,-113.580,'America/Edmonton'], YOW:['Ottawa',45.323,-75.669,'America/Toronto'],
  YTZ:['Toronto Billy Bishop',43.628,-79.396,'America/Toronto'], YUL:['Montreal Trudeau',45.471,-73.741,'America/Toronto'],
  YVR:['Vancouver',49.195,-123.184,'America/Vancouver'], YWG:['Winnipeg',49.910,-97.240,'America/Winnipeg'],
  YYC:['Calgary',51.123,-114.013,'America/Edmonton'], YYZ:['Toronto Pearson',43.677,-79.631,'America/Toronto']
};

// More home airports. None of these are used in the venue notes; they are here so you can fly from them.
Object.assign(AIRPORTS, {
  ALB:['Albany',42.748,-73.802,'America/New_York'], AMA:['Amarillo',35.219,-101.706,'America/Chicago'],
  AVL:['Asheville',35.436,-82.542,'America/New_York'], BHM:['Birmingham',33.563,-86.753,'America/Chicago'],
  BIL:['Billings',45.808,-108.543,'America/Denver'], BOI:['Boise',43.564,-116.223,'America/Boise'],
  BTR:['Baton Rouge',30.533,-91.150,'America/Chicago'], BTV:['Burlington',44.472,-73.153,'America/New_York'],
  BZN:['Bozeman',45.777,-111.153,'America/Denver'], CAE:['Columbia',33.939,-81.119,'America/New_York'],
  CHA:['Chattanooga',35.035,-85.204,'America/New_York'], CID:['Cedar Rapids',41.885,-91.711,'America/Chicago'],
  COS:['Colorado Springs',38.806,-104.701,'America/Denver'], CRW:['Charleston, WV',38.373,-81.593,'America/New_York'],
  DAB:['Daytona Beach',29.180,-81.058,'America/New_York'], DAY:['Dayton',39.902,-84.219,'America/New_York'],
  DLH:['Duluth',46.842,-92.194,'America/Chicago'], ECP:['Panama City',30.357,-85.796,'America/Chicago'],
  EUG:['Eugene',44.125,-123.212,'America/Los_Angeles'], EVV:['Evansville',38.037,-87.532,'America/Chicago'],
  EYW:['Key West',24.556,-81.760,'America/New_York'], FAI:['Fairbanks',64.815,-147.856,'America/Anchorage'],
  FAR:['Fargo',46.921,-96.816,'America/Chicago'], FAT:['Fresno',36.776,-119.718,'America/Los_Angeles'],
  FAY:['Fayetteville, NC',34.991,-78.880,'America/New_York'], FSD:['Sioux Falls',43.582,-96.742,'America/Chicago'],
  FWA:['Fort Wayne',40.978,-85.195,'America/Indiana/Indianapolis'], GEG:['Spokane',47.620,-117.534,'America/Los_Angeles'],
  GNV:['Gainesville',29.690,-82.272,'America/New_York'], GRB:['Green Bay',44.485,-88.130,'America/Chicago'],
  GSO:['Greensboro',36.098,-79.937,'America/New_York'], GSP:['Greenville-Spartanburg',34.896,-82.219,'America/New_York'],
  HPN:['Westchester County',41.067,-73.708,'America/New_York'], HSV:['Huntsville',34.637,-86.775,'America/Chicago'],
  ICT:['Wichita',37.650,-97.433,'America/Chicago'], ILM:['Wilmington, NC',34.271,-77.903,'America/New_York'],
  ISP:['Long Island MacArthur',40.795,-73.100,'America/New_York'], JAN:['Jackson',32.311,-90.076,'America/Chicago'],
  JNU:['Juneau',58.355,-134.576,'America/Juneau'], KOA:['Kona',19.739,-156.046,'Pacific/Honolulu'],
  LBB:['Lubbock',33.664,-101.823,'America/Chicago'], LEX:['Lexington',38.037,-84.606,'America/New_York'],
  LGB:['Long Beach',33.818,-118.152,'America/Los_Angeles'], LIH:['Lihue',21.976,-159.339,'Pacific/Honolulu'],
  LIT:['Little Rock',34.729,-92.224,'America/Chicago'], LNK:['Lincoln',40.851,-96.759,'America/Chicago'],
  MAF:['Midland',31.943,-102.202,'America/Chicago'], MDT:['Harrisburg',40.194,-76.763,'America/New_York'],
  MFR:['Medford',42.374,-122.873,'America/Los_Angeles'], MHT:['Manchester',42.933,-71.436,'America/New_York'],
  MLB:['Melbourne, FL',28.103,-80.645,'America/New_York'], MLI:['Quad Cities',41.448,-90.508,'America/Chicago'],
  MOB:['Mobile',30.691,-88.243,'America/Chicago'], MSN:['Madison',43.140,-89.337,'America/Chicago'],
  MSO:['Missoula',46.916,-114.091,'America/Denver'], MYR:['Myrtle Beach',33.680,-78.928,'America/New_York'],
  OGG:['Maui Kahului',20.899,-156.430,'Pacific/Honolulu'], ONT:['Ontario, CA',34.056,-117.601,'America/Los_Angeles'],
  PBI:['West Palm Beach',26.683,-80.096,'America/New_York'], PIA:['Peoria',40.664,-89.693,'America/Chicago'],
  PNS:['Pensacola',30.473,-87.187,'America/Chicago'], PSC:['Tri-Cities, WA',46.265,-119.119,'America/Los_Angeles'],
  PSP:['Palm Springs',33.830,-116.507,'America/Los_Angeles'], PVD:['Providence',41.724,-71.428,'America/New_York'],
  PWM:['Portland, ME',43.646,-70.309,'America/New_York'], RDM:['Redmond/Bend',44.254,-121.150,'America/Los_Angeles'],
  ROA:['Roanoke',37.325,-79.975,'America/New_York'], SAV:['Savannah',32.127,-81.202,'America/New_York'],
  SBA:['Santa Barbara',34.426,-119.840,'America/Los_Angeles'], SBN:['South Bend',41.709,-86.317,'America/Indiana/Indianapolis'],
  SGF:['Springfield, MO',37.246,-93.389,'America/Chicago'], SHV:['Shreveport',32.447,-93.826,'America/Chicago'],
  SJU:['San Juan',18.439,-66.002,'America/Puerto_Rico'], SRQ:['Sarasota',27.395,-82.554,'America/New_York'],
  TLH:['Tallahassee',30.397,-84.350,'America/New_York'], TOL:['Toledo',41.587,-83.808,'America/New_York'],
  TRI:['Tri-Cities, TN',36.475,-82.407,'America/New_York'], TYS:['Knoxville McGhee Tyson',35.811,-83.994,'America/New_York'],
  VPS:['Destin-Fort Walton Beach',30.483,-86.525,'America/Chicago'], XNA:['Northwest Arkansas',36.282,-94.307,'America/Chicago'],
  YHZ:['Halifax',44.881,-63.509,'America/Halifax'], YQB:['Quebec City',46.791,-71.393,'America/Toronto']
});

// Airports where each airline runs a hub or large base. Used to guess whether a nonstop is likely.
export const AIRLINES = {
  AA:['American', ['DFW','CLT','ORD','PHL','MIA','PHX','DCA','LGA','JFK','LAX']],
  DL:['Delta', ['ATL','DTW','MSP','SLC','JFK','LGA','BOS','SEA','LAX']],
  UA:['United', ['ORD','DEN','IAH','EWR','IAD','SFO','LAX']],
  WN:['Southwest', ['DEN','MDW','BWI','DAL','HOU','LAS','PHX','ATL','MCO','BNA','OAK','STL','LAX','SAN','AUS','SMF']],
  AS:['Alaska', ['SEA','PDX','SFO','LAX','SAN','ANC','HNL']],
  B6:['JetBlue', ['JFK','BOS','FLL','MCO']],
  F9:['Frontier', ['DEN','LAS','MCO','ATL','PHL','ORD','DFW','CLE','CVG']],
  NK:['Spirit', ['FLL','DTW','LAS','MCO','DFW','EWR']],
  AC:['Air Canada', ['YYZ','YUL','YVR','YYC']],
  WS:['WestJet', ['YYC','YVR','YYZ','YEG','YWG']]
};

export const TRANSIT_LABEL = { 4:'Train to the door', 3:'Easy transit', 2:'Doable', 1:'Plan on a car', 0:'No notes' };

const r = (a, mins, how) => ({ a, mins, how });

// ── MLB ballparks, by MLB venue id ──
export const MLB_VENUES = {
  15:{ city:'Phoenix', roof:'Retractable roof', level:4, routes:[
    r('PHX',30,'Free PHX Sky Train to 44th St, then Valley Metro Rail toward downtown. Get off at 3rd St; the ballpark is a block away.')]},
  4705:{ city:'Atlanta', level:1, routes:[
    r('ATL',90,'MARTA rail to Arts Center, then CobbLinc bus 10 to Cumberland and a 15 minute walk. No rail reaches the park. A rideshare takes 30 to 50 minutes depending on traffic.')]},
  2:{ city:'Baltimore', level:4, routes:[
    r('BWI',35,'Light RailLink from the airport terminal straight to Camden Yards station, beside the warehouse. Trains on the airport branch run about every 30 minutes.'),
    r('DCA',95,'Metro to Union Station, then MARC Camden or Penn Line to Baltimore. Weekend MARC service is limited.')]},
  3:{ city:'Boston', level:3, routes:[
    r('BOS',45,'Free Silver Line SL1 to South Station, Red Line to Park St, then any Green Line B, C or D train to Kenmore. Five minute walk.')]},
  17:{ city:'Chicago', level:3, routes:[
    r('ORD',70,'Blue Line to Jackson, transfer underground to the Red Line north, get off at Addison. The station is at the ballpark.'),
    r('MDW',65,'Orange Line to Roosevelt, Red Line north to Addison.')]},
  4:{ city:'Chicago', level:4, routes:[
    r('MDW',40,'Orange Line to Roosevelt, Red Line south to Sox-35th. The station is across the street.'),
    r('ORD',75,'Blue Line to Jackson, transfer underground to the Red Line south, get off at Sox-35th.')]},
  2602:{ city:'Cincinnati', level:2, routes:[
    r('CVG',50,'TANK Airport Express bus to downtown Cincinnati, then a 10 minute walk to the river. The bus runs about hourly, so time your landing.')]},
  5:{ city:'Cleveland', level:4, routes:[
    r('CLE',40,'RTA Red Line from inside the terminal to Tower City, then a covered walkway most of the way to the ballpark.')]},
  19:{ city:'Denver', level:4, routes:[
    r('DEN',50,'RTD A Line to Union Station, 37 minutes, then a 10 minute walk up Wynkoop St.')]},
  2394:{ city:'Detroit', level:2, routes:[
    r('DTW',55,'DAX express bus to downtown Detroit, about hourly, then a 10 minute walk or the QLine up Woodward.')]},
  2392:{ city:'Houston', roof:'Retractable roof', level:2, routes:[
    r('HOU',55,'METRO bus 40 to downtown, then a 10 minute walk east.'),
    r('IAH',80,'METRO bus 102 to downtown, then walk or take the Green or Purple Line two stops. A rideshare takes about 30 minutes.')]},
  7:{ city:'Kansas City', level:1, routes:[
    r('MCI',120,'Transit means a bus downtown and a second bus east, around two hours. Rent a car or take a rideshare, about 35 minutes.')]},
  1:{ city:'Anaheim', level:2, routes:[
    r('SNA',25,'No direct transit worth taking. A rideshare is about 20 minutes.'),
    r('LAX',120,'FlyAway bus to Union Station, then Metrolink Orange County Line or Amtrak Pacific Surfliner to Anaheim. The station is across the parking lot. Check the last train back.')]},
  22:{ city:'Los Angeles', level:2, routes:[
    r('LAX',90,'FlyAway bus to Union Station, then the free Dodger Stadium Express bus, which starts about two hours before first pitch.'),
    r('BUR',70,'Metrolink or Amtrak from the airport station to Union Station, then the free Dodger Stadium Express bus.')]},
  4169:{ city:'Miami', roof:'Retractable roof', level:2, routes:[
    r('MIA',45,'Metrorail Orange Line to Civic Center, then the free Miami Trolley or a 20 minute walk. A rideshare is about 15 minutes.'),
    r('FLL',100,'Shuttle to the Tri-Rail station, Tri-Rail south to the Metrorail transfer, Metrorail to Civic Center.')]},
  32:{ city:'Milwaukee', roof:'Retractable roof', level:1, routes:[
    r('MKE',75,'A bus downtown and a second bus west, about 75 minutes. A rideshare takes about 15 minutes and is what most visitors do.')]},
  3312:{ city:'Minneapolis', level:4, routes:[
    r('MSP',30,'Metro Blue Line from either terminal to Target Field station, the last stop. It lets you out at the gate.')]},
  3289:{ city:'New York', level:4, routes:[
    r('LGA',35,'Free Q70 LaGuardia Link bus to 74 St-Roosevelt Av, then the 7 train to Mets-Willets Point.'),
    r('JFK',60,'AirTrain to Jamaica, LIRR to Woodside, then the 7 train to Mets-Willets Point.'),
    r('EWR',85,'NJ Transit to Penn Station, then the LIRR Port Washington Branch or the 7 train to Mets-Willets Point.')]},
  3313:{ city:'New York', level:3, routes:[
    r('LGA',50,'M60 Select Bus to 125 St and Lexington Av, then the 4 train to 161 St-Yankee Stadium.'),
    r('JFK',85,'AirTrain to Jamaica, E train to Manhattan, then the 4 or D train to 161 St-Yankee Stadium.'),
    r('EWR',80,'NJ Transit to Penn Station, walk to 34 St-Herald Sq, then the D train to 161 St-Yankee Stadium.')]},
  2529:{ city:'West Sacramento', level:2, routes:[
    r('SMF',50,'Yolobus 42 to downtown Sacramento, about hourly, then a 15 minute walk across the Tower Bridge. A rideshare is about 15 minutes.')]},
  2681:{ city:'Philadelphia', level:3, routes:[
    r('PHL',55,'SEPTA Airport Line to Jefferson or Suburban Station, then the Broad Street Line south to NRG station, the last stop. The park is only 10 minutes from the airport by car.')]},
  31:{ city:'Pittsburgh', level:2, routes:[
    r('PIT',60,'28X Airport Flyer bus to downtown, then walk across the Clemente Bridge, about 10 minutes.')]},
  2680:{ city:'San Diego', level:3, routes:[
    r('SAN',30,'Bus 992 to downtown, then a 15 minute walk or the trolley to Gaslamp Quarter. The airport is two miles from the ballpark.')]},
  2395:{ city:'San Francisco', level:3, routes:[
    r('SFO',50,'BART to Embarcadero, then Muni N or T to 2nd and King, or a 20 minute walk along the water.'),
    r('OAK',55,'BART airport connector to Coliseum, BART to Embarcadero, then Muni or a 20 minute walk.'),
    r('SJC',90,'Shuttle bus to Santa Clara station, then Caltrain to San Francisco. The terminal is a block from the ballpark.')]},
  680:{ city:'Seattle', roof:'Retractable roof', level:4, routes:[
    r('SEA',40,'Link 1 Line to Stadium station, then a 10 minute walk.')]},
  2889:{ city:'St. Louis', level:4, routes:[
    r('STL',35,'MetroLink Red Line from the terminal to Stadium station, at the ballpark.')]},
  12:{ city:'St. Petersburg', roof:'Dome', level:1, routes:[
    r('TPA',100,'No practical transit across the bay. A rideshare is about 30 minutes.'),
    r('PIE',70,'A PSTA bus with a transfer, or a 25 minute rideshare.')]},
  5325:{ city:'Arlington', roof:'Retractable roof', level:1, routes:[
    r('DFW',25,'Arlington has no bus or rail to the ballpark. A rideshare from DFW is about 20 minutes.'),
    r('DAL',35,'Rideshare, about 30 minutes.')]},
  14:{ city:'Toronto', roof:'Retractable roof', level:4, routes:[
    r('YYZ',40,'UP Express to Union Station, 25 minutes, then the indoor SkyWalk to the ballpark. Bring your passport.'),
    r('YTZ',20,'Walk through the tunnel to the mainland, then 15 minutes east along the waterfront.')]},
  3309:{ city:'Washington', level:4, routes:[
    r('DCA',25,"Metro Yellow Line to L'Enfant Plaza, then the Green Line to Navy Yard-Ballpark."),
    r('IAD',75,"Metro Silver Line to L'Enfant Plaza, then the Green Line to Navy Yard-Ballpark."),
    r('BWI',85,'Shuttle to the BWI rail station, MARC Penn Line to Union Station, Red Line to Gallery Place, Green Line to Navy Yard-Ballpark.')]}
};

// ── Triple-A ballparks, by MLB venue id ──
export const AAA_VENUES = {
  2767:{ city:'Toledo', level:1, routes:[
    r('DTW',60,'The nearest big airport is Detroit, 50 miles north. Rent a car; about an hour on I-75.')]},
  3230:{ city:'Allentown', level:2, routes:[
    r('ABE',10,'The ballpark is two miles from the terminal. A rideshare takes under 10 minutes.'),
    r('PHL',80,'Rent a car; about 75 minutes up I-476.')]},
  2844:{ city:'Des Moines', level:2, routes:[
    r('DSM',15,'A rideshare is about 10 minutes. DART bus 8 also runs downtown, a 15 minute walk from the park.')]},
  3789:{ city:'Reno', level:2, routes:[
    r('RNO',15,'Three miles from the terminal. A rideshare is about 10 minutes; an RTC bus downtown takes about 25.')]},
  5355:{ city:'Las Vegas', level:1, routes:[
    r('LAS',30,'The ballpark is in Summerlin, 12 miles west of the Strip. A rideshare is about 25 minutes.')]},
  2745:{ city:'Tacoma', level:1, routes:[
    r('SEA',35,'A rideshare is about 30 minutes. By transit, ST Express 574 to Tacoma Dome and a local bus, around 80 minutes.')]},
  2797:{ city:'Moosic', level:2, routes:[
    r('AVP',10,'The ballpark is five miles from the terminal. A rideshare is about 10 minutes.'),
    r('EWR',130,'Rent a car; about two hours on I-80 and I-380.')]},
  5410:{ city:'Worcester', level:2, routes:[
    r('BOS',110,'Silver Line SL1 to South Station, then the MBTA Worcester Line to Union Station and a 10 minute walk. Trains are about hourly.')]},
  2773:{ city:'Rochester', level:2, routes:[
    r('ROC',15,'A rideshare is about 10 minutes. RTS buses run downtown, a 10 minute walk from the park.')]},
  2683:{ city:'Albuquerque', level:2, routes:[
    r('ABQ',10,'Two miles from the terminal. A rideshare is about 7 minutes; ABQ Ride bus 50 also passes nearby on Yale Blvd.')]},
  4271:{ city:'Papillion', level:1, routes:[
    r('OMA',30,'The ballpark is in the suburbs southwest of Omaha. A rideshare is about 25 minutes.')]},
  2724:{ city:'Louisville', level:2, routes:[
    r('SDF',15,'A rideshare is about 10 minutes. TARC bus 2 also runs downtown.')]},
  2858:{ city:'Indianapolis', level:2, routes:[
    r('IND',50,'IndyGo route 8 to the downtown transit center, then a 15 minute walk west. A rideshare is about 20 minutes.')]},
  2756:{ city:'Buffalo', level:2, routes:[
    r('BUF',50,'NFTA bus 24 to downtown, then a short walk. A rideshare is about 15 minutes.')]},
  2528:{ city:'Round Rock', level:1, routes:[
    r('AUS',40,'Round Rock is 30 miles north of the airport. Rent a car or take a rideshare, about 35 minutes without traffic.')]},
  4669:{ city:'El Paso', level:2, routes:[
    r('ELP',20,'A rideshare is about 15 minutes. Sun Metro buses run downtown in about 40.')]},
  5472:{ city:'St. Paul', level:3, routes:[
    r('MSP',35,'Bus 54 to downtown St. Paul, about 25 minutes, then a 10 minute walk. The Green Line also stops at Union Depot, two blocks from the park.')]},
  2823:{ city:'Syracuse', level:2, routes:[
    r('SYR',15,'A rideshare is about 10 minutes.')]},
  2541:{ city:'Durham', level:2, routes:[
    r('RDU',60,'GoTriangle bus 100 to the Regional Transit Center, then bus 700 to Durham Station and a 10 minute walk. A rideshare is about 20 minutes.')]},
  2542:{ city:'Memphis', level:2, routes:[
    r('MEM',20,'A rideshare is about 15 minutes. The park is downtown, two blocks from Beale Street.')]},
  4715:{ city:'Nashville', level:2, routes:[
    r('BNA',45,'WeGo bus 18 to downtown, then a 15 minute walk north. A rideshare is about 15 minutes.')]},
  4670:{ city:'Charlotte', level:3, routes:[
    r('CLT',35,'Sprinter bus 5 to uptown, about 25 minutes, then a short walk. The park is in the middle of uptown.')]},
  2843:{ city:'Oklahoma City', level:2, routes:[
    r('OKC',20,'A rideshare is about 15 minutes to Bricktown. Bus service from the airport is limited.')]},
  3810:{ city:'Lawrenceville', level:1, routes:[
    r('ATL',55,'The ballpark is 40 miles northeast of the airport. Rent a car; about 50 minutes without traffic.')]},
  6135:{ city:'South Jordan', level:3, routes:[
    r('SLC',80,'TRAX Green Line downtown, then the Red Line to the end at Daybreak. The ballpark is beside the station. A rideshare is about 30 minutes.')]},
  2852:{ city:'Jacksonville', level:1, routes:[
    r('JAX',25,'A rideshare is about 20 minutes. There is no useful transit from the airport.')]},
  2781:{ city:'Norfolk', level:2, routes:[
    r('ORF',20,'A rideshare is about 15 minutes. The Tide light rail stops at the park but does not reach the airport.')]},
  5421:{ city:'Sugar Land', level:1, routes:[
    r('HOU',35,'A rideshare is about 30 minutes.'),
    r('IAH',50,'A rideshare is about 45 minutes.')]},
  3970:{ city:'Columbus', level:2, routes:[
    r('CMH',40,'COTA bus 7 to downtown, about 30 minutes, then a 10 minute walk to the Arena District. A rideshare is about 12 minutes.')]}
};
AAA_VENUES[2529] = MLB_VENUES[2529]; // Sutter Health Park is shared with the Athletics

// ── NHL arenas, by home team ──
const a = (name, city, lat, lon, tz, level, routes) => ({ name, city, lat, lon, tz, level, routes, indoor: true });
export const NHL_ARENAS = {
  ANA:a('Honda Center','Anaheim',33.8078,-117.8765,'America/Los_Angeles',2,[
    r('SNA',25,'A rideshare is about 20 minutes.'),
    r('LAX',120,'FlyAway bus to Union Station, then Metrolink or Amtrak to Anaheim. The station is across the street from the arena. Check the last train back.')]),
  BOS:a('TD Garden','Boston',42.3662,-71.0621,'America/New_York',4,[
    r('BOS',30,'Free shuttle to the Blue Line, Blue Line to State, then the Orange Line two stops to North Station, which is under the arena.')]),
  BUF:a('KeyBank Center','Buffalo',42.8750,-78.8764,'America/New_York',2,[
    r('BUF',55,'NFTA bus 24 to downtown, then Metro Rail, free above ground, to the last stop by the arena. A rideshare is about 15 minutes.')]),
  CGY:a('Scotiabank Saddledome','Calgary',51.0374,-114.0519,'America/Edmonton',2,[
    r('YYC',50,'Bus 300 to downtown, then the CTrain Red Line south to Victoria Park/Stampede. Bring your passport.')]),
  CAR:a('Lenovo Center','Raleigh',35.8033,-78.7220,'America/New_York',1,[
    r('RDU',20,'No useful transit. A rideshare is about 15 minutes.')]),
  CHI:a('United Center','Chicago',41.8807,-87.6742,'America/Chicago',3,[
    r('ORD',55,'Blue Line to Illinois Medical District, then a 15 minute walk north, or the 20 Madison bus from downtown.'),
    r('MDW',55,'Orange Line to the Loop, then the Green Line west to Damen, a five minute walk from the arena.')]),
  COL:a('Ball Arena','Denver',39.7487,-105.0077,'America/Denver',4,[
    r('DEN',55,'RTD A Line to Union Station, then the E or W light rail one stop to Ball Arena, or a 15 minute walk.')]),
  CBJ:a('Nationwide Arena','Columbus',39.9693,-83.0061,'America/New_York',2,[
    r('CMH',40,'COTA bus 7 to downtown, about 30 minutes, then a 10 minute walk. A rideshare is about 12 minutes.')]),
  DAL:a('American Airlines Center','Dallas',32.7905,-96.8103,'America/Chicago',4,[
    r('DFW',55,'DART Orange Line from Terminal A straight to Victory station, at the arena.'),
    r('DAL',30,'Love Link bus to Inwood/Love Field station, then the Green or Orange Line to Victory.')]),
  DET:a('Little Caesars Arena','Detroit',42.3411,-83.0553,'America/Detroit',2,[
    r('DTW',60,'DAX express bus to downtown Detroit, about hourly, then the QLine up Woodward to the arena.')]),
  EDM:a('Rogers Place','Edmonton',53.5469,-113.4979,'America/Edmonton',2,[
    r('YEG',75,'Bus 747 to Century Park, then the Capital Line LRT downtown. The airport is 30 km south, so a rideshare is about 35 minutes. Bring your passport.')]),
  FLA:a('Amerant Bank Arena','Sunrise',26.1584,-80.3256,'America/New_York',1,[
    r('FLL',30,'The arena is out by the Everglades. A rideshare is about 25 minutes.'),
    r('MIA',45,'A rideshare is about 40 minutes.')]),
  LAK:a('Crypto.com Arena','Los Angeles',34.0430,-118.2673,'America/Los_Angeles',2,[
    r('LAX',70,'Shuttle to the LAX/Metro Transit Center, K Line to Expo/Crenshaw, then the E Line to Pico, at the arena.'),
    r('BUR',60,'Metrolink or Amtrak to Union Station, then the A or E Line to Pico.')]),
  MIN:a('Grand Casino Arena','St. Paul',44.9448,-93.1011,'America/Chicago',3,[
    r('MSP',35,'Bus 54 to downtown St. Paul, about 25 minutes, then a 10 minute walk.')]),
  MTL:a('Bell Centre','Montreal',45.4961,-73.5693,'America/Toronto',3,[
    r('YUL',50,'747 express bus to downtown; it stops within a few blocks of the arena. Bring your passport.')]),
  NSH:a('Bridgestone Arena','Nashville',36.1592,-86.7785,'America/Chicago',2,[
    r('BNA',40,'WeGo bus 18 to downtown, then a five minute walk. A rideshare is about 15 minutes.')]),
  NJD:a('Prudential Center','Newark',40.7335,-74.1711,'America/New_York',4,[
    r('EWR',25,'AirTrain to the airport rail station, NJ Transit one stop to Newark Penn Station, then a five minute walk.'),
    r('LGA',90,'Bus and subway to Penn Station in Manhattan, then NJ Transit or PATH to Newark Penn Station.')]),
  NYI:a('UBS Arena','Elmont',40.7118,-73.7257,'America/New_York',3,[
    r('JFK',45,'AirTrain to Jamaica, then the LIRR to Elmont-UBS Arena.'),
    r('LGA',60,'Q70 bus to Woodside, then the LIRR to Elmont-UBS Arena, usually changing at Jamaica.')]),
  NYR:a('Madison Square Garden','New York',40.7505,-73.9934,'America/New_York',4,[
    r('JFK',50,'AirTrain to Jamaica, then the LIRR to Penn Station, directly under the Garden.'),
    r('LGA',45,'Q70 bus to Woodside, then the LIRR one stop to Penn Station.'),
    r('EWR',40,'AirTrain to the airport rail station, then NJ Transit to Penn Station.')]),
  OTT:a('Canadian Tire Centre','Ottawa',45.2969,-75.9272,'America/Toronto',1,[
    r('YOW',35,'The arena is in Kanata, 25 km west of downtown. A rideshare is about 30 minutes. Bring your passport.')]),
  PHI:a('Xfinity Mobile Arena','Philadelphia',39.9012,-75.1720,'America/New_York',3,[
    r('PHL',55,'SEPTA Airport Line to Jefferson or Suburban Station, then the Broad Street Line south to NRG station. The arena is 10 minutes from the airport by car.')]),
  PIT:a('PPG Paints Arena','Pittsburgh',40.4395,-79.9893,'America/New_York',2,[
    r('PIT',60,'28X Airport Flyer bus to downtown, then a 10 minute walk uphill.')]),
  SJS:a('SAP Center','San Jose',37.3328,-121.9012,'America/Los_Angeles',2,[
    r('SJC',15,'Three miles from the terminal. A rideshare is about 10 minutes.'),
    r('SFO',90,'BART to Millbrae, then Caltrain to San Jose Diridon, across the street from the arena.')]),
  SEA:a('Climate Pledge Arena','Seattle',47.6221,-122.3540,'America/Los_Angeles',4,[
    r('SEA',55,'Link 1 Line to Westlake, then the Monorail two minutes to Seattle Center.')]),
  STL:a('Enterprise Center','St. Louis',38.6268,-90.2026,'America/Chicago',4,[
    r('STL',30,'MetroLink Red Line from the terminal to Civic Center station, across the street.')]),
  TBL:a('Benchmark International Arena','Tampa',27.9427,-82.4518,'America/New_York',2,[
    r('TPA',45,'HART bus 30 to downtown, then a 15 minute walk or the free streetcar. A rideshare is about 15 minutes.')]),
  TOR:a('Scotiabank Arena','Toronto',43.6435,-79.3791,'America/Toronto',4,[
    r('YYZ',30,'UP Express to Union Station, 25 minutes. The arena connects to the station indoors. Bring your passport.'),
    r('YTZ',20,'Walk through the tunnel to the mainland, then a 15 minute walk or the 509 streetcar.')]),
  UTA:a('Delta Center','Salt Lake City',40.7683,-111.9011,'America/Denver',4,[
    r('SLC',20,'TRAX Green Line from the terminal to Arena station.')]),
  VAN:a('Rogers Arena','Vancouver',49.2778,-123.1089,'America/Vancouver',4,[
    r('YVR',35,'Canada Line to Vancouver City Centre, then a 12 minute walk, or one stop on the Expo Line to Stadium-Chinatown. Bring your passport.')]),
  VGK:a('T-Mobile Arena','Las Vegas',36.1028,-115.1784,'America/Los_Angeles',2,[
    r('LAS',15,'Three miles from the terminal. A rideshare is about 10 minutes.')]),
  WSH:a('Capital One Arena','Washington',38.8981,-77.0209,'America/New_York',4,[
    r('DCA',20,'Metro Yellow Line to Gallery Place, which is under the arena.'),
    r('IAD',65,'Metro Silver Line to Metro Center, then a 10 minute walk or one stop on the Red Line.')]),
  WPG:a('Canada Life Centre','Winnipeg',49.8928,-97.1436,'America/Winnipeg',2,[
    r('YWG',35,'A city bus downtown takes about 30 minutes. A rideshare is about 15. Bring your passport.')])
};
