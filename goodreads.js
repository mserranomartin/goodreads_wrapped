const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PALETTE = ['cb997e','ddbea9','ffe8d6','b7b7a4','a5a58d','6b705c']; 
//https://coolors.co/palette/cb997e-ddbea9-ffe8d6-b7b7a4-a5a58d-6b705c
//https://coolors.co/palette/ccd5ae-e9edc9-fefae0-faedcd-d4a373
//https://coolors.co/palette/f08080-f4978e-f8ad9d-fbc4ab-ffdab9 PINKS
//https://coolors.co/palette/585123-eec170-f2a65a-f58549-772f1a

const layout = {
    legend: {"orientation": "h"},
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    modebar: {
        activecolor: 'rgb(0,0,0,0)'
    },
    autosize: false,
    width: WIDTH,
    margin: {
        l: 20,
        r: 20,
        b: 50,
        t: 50,
    },
};

function wrapped(df){

    df.addColumn('Read This Year', df['Date Read'].dt.year().eq(2022), {inplace: true});
    df.addColumn('Added This Year', df['Date Added'].dt.year().eq(2022), {inplace: true});
    
    monthly(df);
    numberBooks(df);
    newauthors(df);
    currentToReadPile(df);
    readFromToReadPile(df);
    mostRead(df);
    ratingComparison(df);
    languages(df);
}

function numberBooks(df){
    let n = df.groupby(['Read This Year']).getGroup([true])['Title'].count();
    let div = document.getElementById('number_books');
    if (n > 0){
        div.innerHTML = "<h1 class='highlight'>"+n+"</h1><h4>books!</h4>";
    } else {
        div.innerHTML = "<h1 class='highlight'>"+0+"</h1><h4>books :(</h4>";
    }
}

function countries(df) {
    let readThisYear = df.groupby(['Read This Year']).getGroup([true]);
    let authors = readThisYear['Author'].values;

    async function getLanguages(bookData){
        const promises = bookData.map(a => googleBooksAPI(a));
        const languages = await Promise.all(promises);
    
        return languages
    }

}

function languages(df){
    let readThisYear = df.groupby(['Read This Year']).getGroup([true]);
    let bookData = readThisYear.loc({columns:['Title','Author', 'ISBN', 'ISBN13']}).values;

    async function getLanguages(bookData){
        const promises = bookData.map(a => googleBooksAPI(a));
        const languages = await Promise.all(promises);
    
        return languages
    }
    
    getLanguages(bookData).then(languages => {
        let langCount = {}

        languages.forEach(lang => {
            if (Object.keys(langCount).includes(lang)) {
                langCount[lang] += 1;
            } else {
                langCount[lang] = 1;
            }
        });
                
        // plot
        Object.assign(layout, {
            title: {
                text: "Languages"
            },
            })

        var data = [{
            values: Object.values(langCount),
            labels: Object.keys(langCount),
            marker:{
                colors: PALETTE,
            },
            type: 'pie',
            textinfo: 'value',
            automargin: true,
            }];
        
        Plotly.newPlot('languages', data, layout, {displayModeBar: false});
    });
}

async function googleBooksAPI(x){
    var url = 'https://www.googleapis.com/books/v1/volumes?q=' + x[0]+' '+ x[1];

    let data, lang;
    let response = await fetch(url);

    if (200 <= response['status'] && response['status'] < 300){
        data = await response.json();
        if (Object.keys(data).includes('items')) {
            lang = data.items[0].volumeInfo.language;                
        } else {
            console.log("Couldn't find " + x[0] + ' by ' +x[1])
            lang = 'unknown';
        }
    } else {
        console.log("Request for '" + x[0] + "' by " +x[1]+ " failed.")
        lang = 'unknown';
    }

    return lang
}

function ratingComparison(df) {
    let readThisYear = df.groupby(['Read This Year']).getGroup([true]);
    let myRating = readThisYear['My Rating'].values;
    let avgRating = readThisYear['Average Rating'].values;
    
    let corr = pcorr(myRating, avgRating).toFixed(2);
    let color = gradientValue(corr);

    // scatterPlot
    var data = {
        x: avgRating,
        y: myRating,
        type: 'scatter',
        mode: 'markers',
        marker:{
            color: PALETTE[0]
        } 
    };
    
    Object.assign(layout, {
        annotations: [{
              x: 4.5,
              y: 5.5,
              xref: 'x',
              yref: 'y',
              text: "Correlation: " + corr,
              ax: 0,
              ay: 0
            }],
        xaxis: {
            automargin: true,
            title: {
                text: "Average Rating",
                standoff: 20
            },
            showgrid: false,
            showline: true,
            range: [0,5.5],
            tickmode: 'array',
            tickvals: [1,2,3,4,5]
        },
        yaxis: {
            automargin: true,
            margin: 5,
            title: {
                text: "Your rating",
                standoff: 10
            },
            showgrid: false,
            showline: true,
            range: [0,5.5],
            tickmode: 'array',
            tickvals: [0,1,2,3,4,5]
        },
        height: WIDTH
    });
    Plotly.newPlot('rating_comp', [data], layout, {displayModeBar: false});

    let text = document.getElementById('correlation_text');
    if (corr < 0.5) {
        text.innerText = "...and your opinions didn't really match with the average"
    } else if (0.5 <=corr <0.8) {
        text.innerText = "...and you did not disagree much with others"
    } else {
        text.innerText = '...and thought that the reviews were quite right!'
    }
}

function mostRead(df){
    let readThisYear = df.groupby(['Read This Year']).getGroup([true]);
    let booksAuthor = readThisYear.groupby(['Author']).col(['Author']).count();
    let mostAuthor = booksAuthor.loc({columns:['Author'], rows:[booksAuthor['Author_count'].argMax()]});
    let n = booksAuthor['Author_count'].max();

    div = document.getElementById('most_read');

    if (n>1) {
        div.innerHTML = "<h2 class='highlight'>"+mostAuthor.values+"</h2>";
    } else {
        div.parentElement.removeChid(document.getElementById('most_read_text'));
        div.parentElement.removeChid(div);
    }

}

function monthly(df){
    let readThisYear = df.groupby(['Read This Year']).getGroup([true]);
    readThisYear.addColumn("Month", readThisYear['Date Read'].dt.monthName(), { inplace: true });
    let monthlyReads = readThisYear.groupby(["Month"]).col(["Read Count"]).count();
    monthlyReads.rename({ "Read Count_count": "Book Count" }, { inplace: true });
    let y = [];
    MONTH_NAME.forEach(m => {
        if (monthlyReads['Month'].values.includes(m)){
            n = monthlyReads.query(monthlyReads['Month'].eq(m))['Book Count'].values[0] 
            y.push(n);
        } else {
            y.push(0);
        }
    });
    
    // barplot
    Object.assign(layout, {
        yaxis: {
            showgrid: false,
            showline: true,
        },
        height: WIDTH,
    })
    let data = {
        x: MONTH_NAME,
        y: y,
        type: 'bar',
        name: 'Books read per month',
        marker: {
          color: PALETTE[0],
          opacity: 0.7,
        }
      };
    Plotly.newPlot('monthly_reads', [data], layout, {displayModeBar: false});
}

function newauthors(df){
    // number of new authors you've read
    let isReadThisYear = df.groupby(['Read This Year'])
    let authorsThisYear = isReadThisYear.getGroup([true])['Author'].unique().values;
    let authorsPreviousYears = isReadThisYear.getGroup([false])['Author'].unique().values;
    let newNames = authorsThisYear.filter(name => !authorsPreviousYears.includes(name));
    let div = document.getElementById('new_authors');
    if (newNames.length > 0){
        div.innerHTML = "<h1 class='highlight'>"+newNames.length+"</h1><h4>new authors!</h4>";
    } else {
        div.innerHTML = "<h1 class='highlight'>"+0+"</h1><h4>new authors :(</h4>";
    }
}

function readFromToReadPile(df){
    // #(read this year from Added previous yeards)
    let addedBefore = df.groupby(['Added This Year']).getGroup([false])
                        .groupby(['Read This Year']).col(['Read This Year']).count();

    let stillUnread, actuallyRead;
    if (addedBefore['Read This Year'].values.length == 2) {
        stillUnread = addedBefore['Read This Year_count'].values[0],
        actuallyRead = addedBefore['Read This Year_count'].values[1];
    } else {
        if (addedBefore['Read This Year'].values[0] == false) {
            stillUnread = addedBefore['Read This Year_count'].values[0];
            actuallyRead = 0;
        } else {
            actuallyRead = addedBefore['Read This Year_count'].values[0];
            stillUnread = 0;
        }
    }

    console.log()
    
    // plot
    var data = [{
        values: [actuallyRead, stillUnread],
        labels: ['Read this year','Still unread'],
        marker:{
            colors: PALETTE,
        },
        type: 'pie',
        textinfo: 'value',
        automargin: true,
        }];
    
    Object.assign(layout, {
        height: screen.availHeight/3.5,
    })
    
    let text = document.getElementById('to_read_text1')
    
    if (stillUnread == 0) {
        text.innerText = "You didn't have anything on your to-read pile"
    } else {
        if (actuallyRead == 0){
            text.innerText = "You didn't touch your last year's to-read pile"
        } else if (actuallyRead/(stillUnread + actuallyRead) < 0.5) {
            text.innerText = "Your last year's pile to-read pile is still to be read "
        } else {
            text.innerText = 'Wow, you are actually reading from your to-read pile'
        }
    }
    Plotly.newPlot('read_from_to_read', data, layout, {displayModeBar: false}); 
}

function currentToReadPile(df){
    // #(to-read this year) vs #(to-read remaining from previous years)
    let toReadBalance = df.query(df['Exclusive Shelf'].eq('to-read'))
                            .groupby(["Added This Year"]).col(['Added This Year']).count();
    
    let addedBefore, addedThisYear;
    if (toReadBalance['Added This Year'].values.length == 2) {
        addedThisYear = toReadBalance['Added This Year_count'].values[0],
        addedBefore = toReadBalance['Added This Year_count'].values[1];
    } else {
        if (toReadBalance['Added This Year'].values[0] == false) {
            addedBefore = toReadBalance['Added This Year_count'].values[0];
            addedThisYear = 0;
        } else {
            addedThisYear = toReadBalance['Added This Year_count'].values[0];
            addedBefore = 0;
        }
    }
    
    // plot
    var data = [{
        values: [addedThisYear, addedBefore],
        labels: ['Added this year', 'Added in previous years'],
        marker:{
            colors: PALETTE,
        },
        type: 'pie',
        textinfo: 'value',
        automargin: true,
        }];
    
    Object.assign(layout, {
        height: screen.availHeight/3.5,
    })

    let text = document.getElementById('to_read_text2')
    
    if (addedBefore + addedThisYear == 0) {
        text.innerText = "and you kept everything tidy, you have no books on your to-read pile!";
    } else {
        if (addedBefore == 0) {
            text.innerText = 'but starting from 0, the only way is up!';
        } else {
            if (addedThisYear == 0){
                text.innerText = "and you left it as it was";
            } else if (addedThisYear/(addedBefore + addedThisYear) < 0.5) {
                console.log(addedThisYear);
                console.log(addedThisYear/(addedBefore + addedThisYear));
                text.innerText = "and you have some new stuff on your plate"
            } else {
                text.innerText = 'and you want to make the problem worse';
            }   
        }
        Plotly.newPlot('current_to_read', data, layout, {displayModeBar: false});
    }
}

// HELPER FUNCTIONS

function times(x,a){
    return x.map(y => y*a)
}

function add(x,y) {
    result = []
    for (let index = 0; index < x.length; index++) {
        result[index] = x[index] + y[index];
    }
    return result
}

function gradientValue(t){
    return add(times([203, 153, 126], 1-t), times([165, 165, 141],t))
}

const pcorr = (x, y) => {
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0,
      sumY2 = 0;
    const minLength = x.length = y.length = Math.min(x.length, y.length),
      reduce = (xi, idx) => {
        const yi = y[idx];
        sumX += xi;
        sumY += yi;
        sumXY += xi * yi;
        sumX2 += xi * xi;
        sumY2 += yi * yi;
      }
    x.forEach(reduce);
    return (minLength * sumXY - sumX * sumY) / Math.sqrt((minLength * sumX2 - sumX * sumX) * (minLength * sumY2 - sumY * sumY));
  };
