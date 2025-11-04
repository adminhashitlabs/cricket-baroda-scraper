import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { group } from 'console';

async function extractTeamsAndDivisionsData(url) {
    console.log('Starting Teams and groups extraction...');

    const browser = await launch({
        headless: false,
    });

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const tournamentDates = await page.evaluate(()=>{
            return document.querySelector('.sc-c049dd72-6,.CMatt').textContent;
        });

        const tournamentName = await page.evaluate(()=>{
            return document.querySelector('.sc-c049dd72-5,.iXuFEE').textContent;
        });

        const [matchType, maxOvers] = await page.evaluate(()=>{
            const spans = document.querySelector('.sc-dab2b1b3-16,.jrhqWb').querySelectorAll('span');
            if(spans.length > 0){
                const matchType = spans[spans.length - 1].textContent;
                if(matchType.toLowerCase() == 'test match'){
                    return ["TEST_MATCH",90];
                }
                const overs = parseInt(matchType.split(" ")[0]);
                if(overs == 20){
                    return ["T20",20];
                }else if(overs == 50){
                    return ["ODI",50];
                }
                return ["OTHER_LIMITED_OVER",overs];
            }
            return ["OTHER_LIMITED_OVER",40];
        });

        const description = tournamentName;
        const startDate = new Date(tournamentDates.split('-')[0].trim());
        const endDate = new Date(tournamentDates.split('-')[1].trim());
        const organizerName = 'Baroda Cricket Association';
        const organizerEmailId = 'info@cricketbaroda.com';
        const organizerPhoneNumber = '+91 265 2336625/26';
        const maxOversPerBowler = 10;
        const tournamentCategory = 'COMMUNITY';
        const ballType = 'LEATHER';
        const leagueId = '21231312';
        const pointForWin = 2;
        const pointForTie = 1;
        const pointForAbandoned = 0;
        const isAbandonedGameCounted = false;
        const rankingPreference = 'TOTAL_POINTS';
        const organizerPhoneNumberCountryCode = '+91';
        const isRosterLocked = true;
        const canEditScoreCard = true;
        const isImpactPlayerAllowed = true;
        
        const putTournamentRequest = {
            tournamentName,
            description,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            organizerName,
            organizerEmailId,
            organizerPhoneNumber,
            matchType,
            maxOversPerBowler,
            maxOvers,
            tournamentCategory,
            ballType,
            leagueId,
            pointForWin,
            pointForTie,
            pointForAbandoned,
            isAbandonedGameCounted,
            rankingPreference,
            organizerPhoneNumberCountryCode,
            isRosterLocked,
            canEditScoreCard,
            isImpactPlayerAllowed
        };

        console.log(`Tournament: ${putTournamentRequest}`);
       
        const totalGroups = await page.evaluate(async()=>{
            const groupsDivisionMap = {};

            
            // find points table tab and click
            document.querySelectorAll('.sc-278848a6-4,.fAvXZS')[3].click();
            // wait for 2 seconds
            await new Promise(resolve => setTimeout(resolve, 2000));
            // count number of groups
            const totalGroups = document.querySelectorAll('.sc-795978f6-0,.fiQGlE');
            const tables = document.querySelectorAll('table');
            totalGroups.forEach((group,index)=>{
                const groupName = group?.textContent;
                console.log(`Group ${index + 1}: ${groupName}`);

                // extract teams in the group
                const table = tables[index];
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach((row)=>{
                    const teamName = row.querySelectorAll('td')[1]?.textContent;
                    console.log(` - Team: ${teamName}`);
                    if(!groupsDivisionMap[groupName]){
                        groupsDivisionMap[groupName] = [];
                    }
                    groupsDivisionMap[groupName].push(teamName);
                });


            });

            return groupsDivisionMap;
        });

        console.log('Total groups extracted:', totalGroups);
        // Write to a JSON file
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const outputPath = join(__dirname, 'data-ingestion-src/teams-and-divisions.json');
        writeFileSync(outputPath, JSON.stringify(totalGroups, null, 2));
        console.log(`Teams and divisions data written to ${outputPath}`);

        // write tournament data to a json file
        const tournamentOutputPath = join(__dirname, 'data-ingestion-src/tournament-data.json');
        writeFileSync(tournamentOutputPath, JSON.stringify(putTournamentRequest, null, 2));
        console.log(`Tournament data written to ${tournamentOutputPath}`);

    } catch (error) {
        console.error('Error extracting player data:', error);
    } finally {
        await browser.close();
    }
}

async function extractTeamsnAndDivision(url) {
    return await extractTeamsAndDivisionsData(url);
}

export default { extractTeamsnAndDivision };

// Run if called directly
extractTeamsnAndDivision(
    'https://cricketbaroda.com/tournament/1625572/All-India-U-16-J.-Y.-Lele-Invitation-Tournament-2025-26' // pass the match url here 
).catch(console.error);
