class Utils {
    toJson(jsonString){
        let json = '';
        for(let index=0; index<jsonString.length;++index){
            if(!(jsonString[index+1] ==='"' && jsonString[index]==='\\')){
                json+=jsonString[index];
            }
        }
        console.log(json);
        return JSON.parse(json);
    }

    toString(json){
        return JSON.stringify(json);
    }
}

module.exports = new Utils();