var dictionary = {};
var map = {};
var encryptionkey = {};
var password = {};
var initVector = {};
var dictionaryNames = ["adjectives", "adverbs", "nouns", "verbs", "pronouns", "prepo"];

function processText(encrypt, force) {

    var nodeError = document.getElementById("error");
    nodeError.innerHTML = "";

    if(Object.keys(dictionary).length != dictionaryNames.length) {
        nodeError.innerHTML = "Internal error : missing dictionaries";
        $(".boutongroup").show();
        $(".boutongroupsure").hide();
        $("#loading").hide();
        return false;
    }
    if(document.getElementById("textAera").value == "") {
        nodeError.innerHTML = "No message to encrypt/decrypt.";
        $(".boutongroup").show();
        $(".boutongroupsure").hide();
        $("#loading").hide();
        return false;
    }
    if(document.getElementById("pwd").value == "") {
        nodeError.innerHTML = "Need a password !";
        $(".boutongroup").show();
        $(".boutongroupsure").hide();
        $("#loading").hide();
        return false;
    }
    if(document.getElementById("pwd").value.length < 9) {
        nodeError.innerHTML = "Password too short, minimum 9 characters.";
        $(".boutongroup").show();
        $(".boutongroupsure").hide();
        $("#loading").hide();
        return false;
    }

    var text = document.getElementById("textAera").value;
    text = text.replace(/(?:\r\n|\r|\n)/g, ' ');

    var iv = "";
    if(encrypt) iv = generateIv(text.split(" ").length);
    else {
        iv = text.split(".")[0];
        text = text.replace(iv + ".", "");
    }

    var array = text.split(" ");

    var result = true;

    /* Check if words isn't in dictionary */
    if(!force) {
        for(var i = 0; i < array.length; i++) {

            var word = removePonctuation(array[i]);
            if(word === "") continue;

            if(!getDicoName(word.toLowerCase())) {
                result = false;

                nodeError.innerHTML = nodeError.innerHTML + word + " ";
                /* underline word */
            }

        }
    }

    if(result) {

        document.getElementById("textAera").value = "";
        if(encrypt) document.getElementById("textAera").value += iv + " ";

        var positionWord = 0;

        for(var i = 0; i < array.length; i++) {

            if(array[i] == "") continue;

            if(isPunctuation(array[i])) {
                document.getElementById("textAera").value += array[i] + " ";
                continue;
            }

            var punctuationBegining = "";
            var punctuationEnd = "";

            if(isPunctuation(array[i].charAt(0))) punctuationBegining = array[i].charAt(0);
            if(isPunctuation(array[i].charAt(array[i].length - 1))) punctuationEnd = array[i].charAt(array[i].length - 1);

            array[i] = removePonctuation(array[i]);
            var wordCase = getCase(array[i]);
            array[i] = array[i].toLowerCase();

            var dicoName = getDicoName(array[i]);
            var word = "";
            if(dicoName) {
                word = changeWord(array[i], dicoName, encrypt, iv, positionWord);
                positionWord++;
            }
            else word = array[i].toLowerCase();

            document.getElementById("textAera").value += punctuationBegining + setCase(word, wordCase) + punctuationEnd + " ";

        }

        return true;

    }
    else {
        nodeError.innerHTML = "These words are not in the dictionary: " + nodeError.innerHTML + ".";
        nodeError.innerHTML += "<br />They will not be encrypted, do you want to proceed anyway ?"
        $(".boutongroup").hide();
        $(".boutongroupsure").show();
        
        return false;
    }

}

String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}

function getCase(word) {

    var wordCase = [];

    for(var i = 0; i < word.length; i++) {
        var character = word[i];
        if (character == character.toLowerCase()) {
            wordCase[i] = false;
        }
        else {
            wordCase[i] = true;
        }
    }

    return wordCase;
}

function setCase(word, wordCase) {

    for(var i = 0; i < word.length && i < wordCase.length; i++) {

        if(wordCase[i]) {
            word = word.replaceAt(i, word[i].toUpperCase());
        }
        else {
            word = word.replaceAt(i, word[i].toLowerCase());
        }

    }

    return word;

}

function getDicoName(word) {

    for (var key in dictionary) {
        if(dictionary[key]["lookup"][word]) return key;
    } 

    return null;

}

function generateIv(size) {

    var nbWords = Math.floor((Math.random() * (0.20 * size)) + 1);

    var iv = "";
    var size = 0;

    while(size < nbWords) {
        for (var key in dictionary) {
            if (dictionary.hasOwnProperty(key)) {
                var ts = Math.round((new Date()).getTime()); 
                var p = (Math.floor((Math.random() * dictionary[key]["position"].length) + 1) * ts) %  dictionary[key]["position"].length;

                if(iv != "") iv += " "; 

                iv += dictionary[key]["position"][p];
                size++;
                if(size > nbWords) break;
            }
        }
    }
    iv += ".";

    return iv;

}

function isPunctuation(word) {

    var p = [".", ",", "?", ";", ":", "(", ")", "{", "}", "-", "_", "!"];

    if(p.indexOf(word) > -1) return true;
    else return false

}

function changeWord(word, dicoName, encrypt, iv, positionWord) {

    if(map[dicoName] == null || password[dicoName] != document.getElementById("pwd").value || initVector[dicoName] != iv) {
        password[dicoName] = document.getElementById("pwd").value;
        initVector[dicoName] = iv;
        var ivNext = removePonctuation(iv);
        ivNext = ivNext.replace(/ /g, "");
        ivNext = ivNext.toLowerCase();
        ivNext += dicoName;
        encryptionkey[dicoName] = generateKey(password[dicoName], ivNext);
        map[dicoName] = generateMap(dictionary[dicoName]["position"].length, encryptionkey[dicoName]["map"]); 
    }

    /* regenerate keys if all used to prevent having twice a plaintext words with same ciphertext word */
    if(positionWord != 0 && (positionWord % encryptionkey[dicoName]["obfuscation"].length == 0)) {
        encryptionkey[dicoName] = regenerateKeys(encryptionkey[dicoName]);
        map[dicoName] = generateMap(dictionary[dicoName]["position"].length, encryptionkey[dicoName]["map"]); 
    }

    var position = dictionary[dicoName]["lookup"][removePonctuation(word)] - 1;
    var w = "";
    
    if(encrypt) { 

        var encryptPosition = (map[dicoName]["encrypt"][position] + (encryptionkey[dicoName]["obfuscation"][positionWord % encryptionkey[dicoName]["obfuscation"].length] % dictionary[dicoName]["position"].length)) % dictionary[dicoName]["position"].length;
        w = dictionary[dicoName]["position"][encryptPosition];

    }
    else {

        var x = 0;

        while( ((x + (encryptionkey[dicoName]["obfuscation"][positionWord % encryptionkey[dicoName]["obfuscation"].length] % dictionary[dicoName]["position"].length)) % dictionary[dicoName]["position"].length) != position || x >= map[dicoName]["encrypt"].length) {
            x++;
        }

        var decryptPosition = map[dicoName]["decrypt"][x];
         w = dictionary[dicoName]["position"][decryptPosition];

    }

    return w;
}

function encrypt() {

    $(".boutongroup").hide();
    $("#loading").show();

    setTimeout(function() {
        if(processText(true, false)) $(".boutongroup").show();
        $("#loading").hide();
    }, 100);

}

function decrypt() {

    $(".boutongroup").hide();
    $("#loading").show();

    setTimeout(function() {
        processText(false, true);
        $(".boutongroup").show();
        $("#loading").hide();
    }, 100);

}

function encryptSure() {

    $(".boutongroup").hide();
    $(".boutongroupsure").hide();
    $("#loading").show();

    setTimeout(function() {
        processText(true, true);
        $(".boutongroup").show();
        $("#loading").hide();
    }, 100);

    var nodeError = document.getElementById("error");
    nodeError.innerHTML = "";
    
}

function decryptSure() {

    var nodeError = document.getElementById("error");
    nodeError.innerHTML = "";
    
    $(".boutongroup").show();
    $(".boutongroupsure").hide();
    $("#loading").hide();

}

function removePonctuation(text) {

    var txt = text.replace(/\./g, "");
    txt = txt.replace(",", "");
    txt = txt.replace("?", "");
    txt = txt.replace(";", "");
    txt = txt.replace(":", "");
    txt = txt.replace("(", "");
    txt = txt.replace(")", "");
    txt = txt.replace("{", "");
    txt = txt.replace("}", "");
    //txt = txt.replace("-", "");
    txt = txt.replace("_", "");
    txt = txt.replace("!", "");

    //txt = txt.toLowerCase();

    return txt;
}

function loadDicionaryFile(words, name) {

    var dict = {};
    var pos = [];

    var y = 1; 
    for ( var i = 0; i < words.length; i++ ) {
        if(!getDicoName(words[i].toLowerCase()) && !dict[words[i].toLowerCase()]) {
            dict[ words[i].toLowerCase() ] = y;
            pos[y - 1] = words[i].toLowerCase();
            y++;
        }
    }

    dictionary[name] = {"lookup": dict, "position": pos};

    loadDicionary();
}

function loadDicionary() {

    var name = "";
    for ( var i = 0; i < dictionaryNames.length; i++ ) {
        if(dictionary[dictionaryNames[i]]) continue;
        else {
            name = dictionaryNames[i];
            break;
        }
    }

    if(name === "") return;

    switch(name) {
        case "adjectives":
            loadDicionaryFile(adjectivesFile,name);
            break;
        case "adverbs":
            loadDicionaryFile(adverbsFile,name);
            break;
        case "nouns":
            loadDicionaryFile(nounsFile,name);
            break;
        case "verbs":
            loadDicionaryFile(verbsFile,name);
            break;
        case "pronouns":
            loadDicionaryFile(pronounsFile,name);
            break;
        case "prepo":
            loadDicionaryFile(prepoFile,name);
            break;
        default:
            break;
    }

}

loadDicionary();
