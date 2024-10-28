export const gameDataConst = {
    songDelay: 4700, // ms // this minus two seconds will be travel time
    maxTailLength: 500,
    targetBoundSizes: {
        top: 0.05,
        bottom: 0.05
    },
    mobile: {
        maxTailLength: 1.2,
        travelLength: 1.285, // fraction of viewWidth
        targetBounds: {
            top: 0.05,      
            bottom: 0.05    
        }
    },
    minNoteGap: 150,    // ms between notes on the same slide
    allSlides: [
        "slide-left",
        "slide-a",
        "slide-b",
        "slide-right"
    ]
}

export const songStages = [
    [
        "blahBlahBlah", // 174 notes 169s
        "liveInMyHead", // medium happy 92.2 // 123 notes 193s
        "innerPeace", // medium *best 89 // 123 notes 152s
        "burningBayou", // 168 notes 176s
        "heyYou"
    ],
    [    
        "lifeIBelieve", // medium 90.9 // 132 notes 169s
        "thinkingOfYou", // medium 87.5
        "rascalBack", // medium country 88.7
        "hypeMeUp", // intense 96.2
        "paleCityGirl", // intense nostalgic 93.9
    ],
    [  
        "indian", // intense 95.4
        "neverBackDown", // medium *best 90.1
        "womanWithTheWind", // medium countryish 93.6
        "wayYouMove",
        "moneyMoney", // intense rap 91.6
    ],
    [ 
        "echoesOfThePast", // medium western 90.4
        "aLifeLikeThis", // medium bouncy 92
        "neverBeBlue", // meduim happy french 89.2
        "schoolGirlCrush", // medium 90.4
        "temptation", // intense countryish 89.7
    ],
    [
        "handle", // intense 88
        "animal", // medium ska 94.7
        "myHeartIsAllYours", // medium happy 96.9 
        "itDoesntMatter", // intense 89.5
        "rockItTonight", // medium oldie 91.9
    ],
    [
        "hotHotFire", // intense 95.9
        "safariSurf",
        "heartBlueBlack", // medium country 94.5
        "pilot",
        "alongTheWay"
    ],
    [
        "myHeart"
    ],
    [
        "prettyThing", // mellow happy 87.2
        "words", // mellow country 94.2
        "intoTheNight", // Brent 90.4
        // "whispersOfTheWreck", // mellow 95
        "inevitable", // medium spanish 82.7
        // "echoesOfRebellion", // medium 90.7      DITCH
        "discoBeat",
        "shareLove",
        
        // below new 7/19
        "getThatFeeling", // intense 94.9 // 109 notes 150s
        "aggressiveMetal",
        // "cactusFlower", // 4.8
        "doItAgain",
        // "edgeOfPossibility", // 5.6
        // "emptyApartment", //
        "getaway",
        // "godDamn", // 3.5
        // "happierWithoutYou", // 4.1
        "lifeIsGood",
        "lollipop",
        "longLostDream",
        "monkeyBusiness",
        // "oneStep",
        // "overSpeedLimit",
        // "oweItToYou", //
        // "risingStar",
        // "shouldBeMe", //
        "sinControl",
        // "stopTheWar", //
        "turnItUp",
        "unmistakable",
        "veryEnd",
        "wannaHaveFun",
        // "whispersOfTheWreck" // 4.2
    ]
];

export const songAuthors = {
    "aggressiveMetal": "Lite Saturation",
    "aLifeLikeThis": "River Lume",
    "alongTheWay": "The Hunts",
    "animal": "Title Holder",
    "blahBlahBlah": "Camille de la Cruz",
    "burningBayou": "Assaf Ayalon",
    "cactusFlower": "Southern Call",
    "discoBeat": `Clarx <a href="https://www.youtube.com/watch?v=_H5UO3c4YtM">NCS</a>`,
    "doItAgain": "Jay Putty",
    "echoesOfRebellion": "R Harris",
    "echoesOfThePast": "Max Hixon",
    "edgeOfPossibility": "SPEARFISHER",
    "emptyApartment": "Title Holder",
    "getaway": "Add9Audio",
    "getThatFeeling": "Ikoliks",
    "godDamn": "Wheres LuLu",
    "handle": "Van Stee",
    "happierWithoutYou": "Jane and the Boy",
    "heartBlueBlack": "Assaf Ayalon",
    "heyYou": "ORKAS",
    "hypeMeUp": "IamDayLight, Curtis Cole, Paper Plastic",
    "hotHotFire": "MILANO",
    "indian": "Taheda",
    "inevitable": "Donnor & Tie",
    "innerPeace": "Yotam Ben Horin",
    "intoTheNight": "Brent Henderson",
    "itDoesntMatter": "Title Holder",
    "lifeIBelieve": "Jon Worthy and the Bends",
    "lifeIsGood": "The Hunts",
    "liveInMyHead": "Eldar Kedem",
    "lollipop": "Captain Joz",
    "longLostDream": "Sunriver",
    "moneyMoney": "MILANO",
    "monkeyBusiness": "Dizzy",
    "myHeart": `Different Heaven & EH!DE <a href="https://www.youtube.com/watch?v=jK2aIUmmdP4">NCS</a>`,
    "myHeartIsAllYours": "Steven Beddall",
    "neverBackDown": "Ben Goldstein feat. Moon",
    "neverBeBlue": "Dan Zeitune",
    "oneStep": "Ben Goldstein",
    "overSpeedLimit": "HoliznaCCO",
    "oweItToYou": "Gidon Schocken",
    "paleCityGirl": "Indiana Bradley",
    "pilot": "Supermans Feinde",
    "prettyThing": "Crosstown Traffic",
    "rascalBack": "Ben Bostick",
    "risingStar": "TURPAK",
    "rockItTonight": "MILANO",
    "schoolGirlCrush": "Brunch with Bunny",
    "safariSurf": "Ofer Koren",
    "shareLove": "Buddha Kid",
    "shouldBeMe": "Kyle Cox",
    "sinControl": "Donner & Tie",
    "stopTheWar": "Dan Ayalon",
    "temptation": "Ride Free",
    "thinkingOfYou": "SOURWAH",
    "turnItUp": "Guesthouse",
    "unmistakable": "Beo",
    "wayYouMove": "Ben Wagner",
    "veryEnd": "Nyron",
    "whispersOfTheWreck": "R Harris",
    "wannaHaveFun": "Flint",
    "womanWithTheWind": "Ben Strawn",
    "words": "Assaf Ayalon"
}

export const songData = {
    "aggressiveMetal": "Aggressive Metal",
    "aHumanBeing": "A Human Being",
    "aLifeLikeThis": "A Life Like This",
    "alongTheWay": "Along the Way",
    "animal": "Animal",
    "anthemOfRain": "Anthem of Rain",
    "aThousandTimes": "A Thousand Times",
    "bigWhiteLimousine": "Big White Limousine",
    "blahBlahBlah": "Blah Blah Blah",
    "burningBayou": "Burning on the Bayou",
    "cactusFlower": "Cactus Flower",
    "canvasOfDreams": "Canvas of Dreams",
    "circusStory": "Russian Circus Story",
    "cosmicCaravan": "Cosmic Caravan",
    "cricket": "Cricket",
    "discoBeat": "Disco",
    "disfigure": "Disfigure",
    "doItAgain": "Do It Again",
    "echoesOfRebellion": "Echoes of Rebellion",
    "echoesOfThePast": "Echoes of the Past",
    "edgeOfPossibility": "Edge of Possibility",
    "emptyApartment": "Empty Apartment",
    "fightSong": "Israel Fight Song",
    "findAWay": "Find a Way",
    "fuckingTribute": "Mysticism of Your Fucking Sound",
    "getaway": "Getaway",
    "getThatFeeling": "Get That Feeling",
    "glowOfTheMoon": "In the Glow of the Moon",
    "godDamn": "God Damn",
    "godOrDevil": "God or the Devil",
    "handle": "Handle",
    "happierWithoutYou": "Happier Without You",
    "heartBlueBlack": "My Heart is Blue Black",
    "heyYou": "Hey You",
    "hotHotFire": "Hot Hot Fire",
    "hypeMeUp": "Hype Me Up",
    "indian": "Indian",
    "inevitable": "Inevitable",
    "innerPeace": "Inner Peace",
    "intoTheNight": "Into the Night",
    "itDoesntMatter": "It Doesn't Matter",
    "keepYou": "Keep You",
    "lifeIBelieve": "A Life I Believe",
    "lifeIsGood": "Life is Good",
    "littleGirl": "Little Girl",
    "liveInMyHead": "Live In My Head",
    "lollipop": "This Lollipop is Poppin",
    "longLostDream": "Long Lost Dream",
    "low": "Low",
    "maniaMaster": "Mania Master",
    "moneyMoney": "Money Money",
    "monkeyBusiness": "Monkey Business",
    "motherOfLife": "Mother of Life",
    "myHeart": "My Heart",
    "myHeartIsAllYours": "My Heart is All Yours",
    "myLife": "It's My Life",
    "needYourLove": "I Need Your Love",
    "neverBackDown": "Never Back Down",
    "neverBeBlue": "Never Be Blue",
    "nowhere": "Nowhere",
    "onAndOn": "On and On",
    "oneStep": "One Step at a Time",
    "oneSweetDream": "One Sweet Dream",
    "overSpeedLimit": "50 Over the Speed Limit",
    "oweItToYou": "I Owe it to You",
    "paleCityGirl": "Pale City Girl",
    "pilot": "Pilot",
    "prettyThing": "Pretty Thing",
    "rascalBack": "The Rascal is Back",
    "risingStar": "Rising Star",
    "rockItTonight": "Rock It Tonight",
    "rockwell": "Rockwell",
    "romeoAndJuliet": "Romeo and Juliet",
    "safariSurf": "Safari Surf",
    "satinDress": "Satin Dress",
    "saturdaySpecial": "Saturday Special",
    "schoolGirlCrush": "School Girl Crush",
    "secretToSell": "Secret to Sell",
    "sexualDeviant": "Pretty Tame Sexual Deviant",
    "shareLove": "Share Love",
    "shouldBeMe": "That Should Be Me",
    "sinControl": "Sin Control",
    "skyHigh": "Sky High",
    "springRain": "Spring Rain",
    "stickAroundYou": "Stick Around You",
    "stopTheWar": "Stop the War",
    "sunnyVibe": "Sunny Vibe",
    "takeMe": "Take Me",
    "temptation": "Temptation",
    "timeOfMyLife": "Time of My Life",
    "thinkingOfYou": "Thinking of You",
    "turnItUp": "Turn It Up",
    "ufo": "UFO",
    "unbreakable": "Unbreakable",
    "unmistakable": "Unmistakable",
    "veryEnd": "Until the Very End",
    "wayYouMove": "Way You Move",
    "wannaHaveFun": "I Just Wanna Have Fun",
    "whispersOfTheWreck": "Whispers of the Wreck",
    "womanWithTheWind": "Woman with the Wind",
    "words": "Words"
    
    
    
}