import { launch } from 'puppeteer';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

class CompleteMatchExtractor {
    constructor(browser, page, url) {
        this.browser = browser;
        this.page = page;
        this.url = url;
        this.playerLookup = new Map();
        this.teams = [];
    }

    

    async extractMatchScheduleData() {
        await this.page.goto(this.url, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // extract teams 
        const [teamOne, teamTwo] = await this.page.evaluate(()=>{
            const teams = [];
            document.querySelectorAll('.sc-aa0570c-12,.Bdprz').forEach(teamParent=>{
                const teamName = teamParent.querySelector('a').textContent;
                teams.push(teamName);
            });

            return teams;
        });


        const [groundName, startDate, matchType] = await this.page.evaluate(()=>{

            const parseDateTime = (dateStr) => {
                const months = {
                    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                };
                
                // Parse: '11 Oct, 2025, 09:30 AM'
                const parts = dateStr.replace(/,/g, '').split(' ');
                const day = parseInt(parts[0]);
                const month = months[parts[1]];
                const year = parseInt(parts[2]);
                const [time, period] = [parts[3], parts[4]];
                
                let [hours, minutes] = time.split(':').map(Number);
                
                // Convert to 24-hour format
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                
                return new Date(year, month, day, hours, minutes);
            };
            // extract match date
            const matchInfos = document.querySelectorAll('.sc-aa0570c-8,.kZBmjd');
            const matchDateText = matchInfos[matchInfos.length - 1].textContent; // '11 Oct, 2025, 09:30 AM'
            const matchDate = parseDateTime(matchDateText); // Convert to Date object
            
            // extract ground name
            const groundName = matchInfos[1].textContent;

            // extract match type
            const matchType = matchInfos[2].textContent;

            return [groundName,matchDate.toISOString(),matchType];
        });

        const tournamentCategory = 'COMMUNITY';
        const pitchType = 'ROUGH';
        const playoffType = 'INITIAL';
        const maxOversPerBowler = 10;

        const matchScheduleData = {
            teamOne,
            teamTwo,
            groundName,
            startDate,
            matchType,
            tournamentCategory,
            pitchType,
            playoffType,
            maxOversPerBowler
        };


        // players association 
        // extract players for teams
        const players = await this.page.evaluate(() => {
            const teamUls = document.querySelectorAll('.sc-3d56998f-12.cGApab');
            const teams  = document.querySelectorAll('.sc-3d56998f-7, .OdhRR');
            var index = 0;
            const playersForMatch = {};
            for(const ul of teamUls){
                const curTeamName = teams[index].textContent.trim();
                index++;
                const currentTeamPlayers = [];
                const playerAnchorElements = ul.querySelectorAll('a');

                for(const playerAnchorElement of playerAnchorElements){
                    const name = playerAnchorElement.textContent?.trim() || '';
                    const playerId = playerAnchorElement.getAttribute('href').split('/')[2];

                    const player = { name, id: playerId };
                    currentTeamPlayers.push(player);

                }
                if(currentTeamPlayers.length > 0){
                    playersForMatch[curTeamName] = currentTeamPlayers;
                }
            }

            return playersForMatch;
        });

        // batting innnings extraction for lineup number 
        const battingInnings = await this.page.evaluate(async()=>{
            scorecard_button = document.querySelectorAll('.sc-83d0d22b-3')[1].querySelector('a');
            scorecard_button.click();

            //sleep
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            let innings = [];

            const battingTeamNamesElements = document.querySelectorAll('h3.sc-7a881374-9, .eJsSZa');
            const tables = document.querySelectorAll('table.sc-7a881374-15, .gXJhZN');

            battingTeamNamesElements.forEach((teamNameElement, index) => {
                const teamName = teamNameElement.textContent.trim();
                const table = tables[index];
                console.log('Processing team:', teamName);
                const rows = table.querySelectorAll('tbody tr');
                const currentInning = {
                    teamName: teamName,
                    players: [],
                };
                for(row of rows){
                    const columns = row.querySelectorAll('td');
                    if(columns.length < 6){
                        continue;
                    }
                    const playerName = columns[0].textContent.trim();
                    const outString = columns[1].textContent.trim();
                    currentInning.players.push({
                        playerName,
                        outString,
                    });
                }
                innings.push(currentInning);
            });
            return innings;
        });

        matchScheduleData.battingInnings = battingInnings;

     

        matchScheduleData.players = players;


        //commentary data 
        const commentaryData = await this.page.evaluate(async ()=>{
            const commentaryEntries = [];

            const commentaryLink = document.querySelectorAll('.sc-83d0d22b-3')[2].querySelector('a');
            commentaryLink.click();

            //sleep
            await new Promise(resolve => setTimeout(resolve, 3000));

            const innings = []; 
            const inningsElements = document.querySelector('select').querySelectorAll('option');
            for(const inningElement of inningsElements){
                innings.push({
                    id : inningElement.getAttribute('value'),
                    name : inningElement.textContent.trim(),
                });
            }
            for(const inning of innings){
                const inningSelect = document.querySelector('select');
                inningSelect.value = inning.id;
                inningSelect.dispatchEvent(new Event('change', { bubbles: true }));

                //sleep
                await new Promise(resolve => setTimeout(resolve, 2000));

                var commentaryOuterElements = document.querySelectorAll('.sc-5abfe348-1, .kokwLL');
                var balls = [];
                commentaryOuterElements.forEach(outerElement=>{
                    const ballNumber = outerElement.querySelector('span, .sc-5abfe348-2, .gQOaFT').textContent.trim().split(".")[1];
                    const ballStat = outerElement.querySelector('.sc-5abfe348-3, .lfzIPi').querySelector('span').textContent.trim();
                    const para = outerElement.querySelector('p');
                    var wicket = null;
                    if(ballStat === 'W'){
                        const wicketInfo = para.querySelector('span').textContent.trim();
                        wicket = wicketInfo;
                    }
                    const commentaryText = para.textContent.trim();
                    balls.push({
                        ballNumber,
                        ballStat,
                        commentaryText,
                        wicket,
                    });
                });

                const commentaryInning = {
                    inningName : inning.name,
                    balls
                };
                commentaryEntries.push(commentaryInning);
            }

            return commentaryEntries;
        });
        matchScheduleData.commentary = commentaryData;


        console.log('Final Match Schedule Data:', matchScheduleData);
        // Write to a JSON file
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const outputPath = join(__dirname, 'data-ingestion-src/match-schedule.json');
        writeFileSync(outputPath, JSON.stringify(matchScheduleData,null,2));
        console.log(`Match scheduled data written to ${outputPath}`);
    }

    

 
}

async function extractMatchData(matchUrl) {
    const browser = await launch({  headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    try {
        const extractor = new CompleteMatchExtractor(browser, page, matchUrl);
        return await extractor.extractMatchScheduleData();
    } catch (error) {
        console.error('❌ Extraction failed:', error.message);
        throw error;
    } finally {
        console.log('\n🔒 Closing browser...');
        await browser.close();
        console.log('✅ Browser closed successfully');
    }
}

async function runCompleteExtraction() {

    const matchUrl = 'https://cricketbaroda.com/match/20079333/Billimora-District-U-14-vs-Navsari-District-U-14';
    return await extractMatchData(matchUrl);
}

export default { extractMatchData };

// Run if called directly
runCompleteExtraction();
