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


        // Write to a JSON file
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const outputPath = join(__dirname, 'data-ingestion-src/match-schedule.json');
        writeFileSync(outputPath, JSON.stringify(matchScheduleData,null,2));
        console.log(`Match scheduled data written to ${outputPath}`);
    }

    

 
}

async function extractMatchData(matchUrl) {
    const browser = await launch({ headless: true });
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

    const matchUrl = 'https://cricketbaroda.com/match/19518599/Baroda-U-16-A-vs-Baroda-U-16-B';
    return await extractMatchData(matchUrl);
}

export default { extractMatchData };

// Run if called directly
runCompleteExtraction();
