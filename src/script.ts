// Import necessary modules
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

// Initialize GitHub client
const octokit = new Octokit({ auth: 'YOUR_GITHUB_TOKEN' });

// Interfaces
interface Student {
  name: string;
  githubUsername: string;
  projectName: string;
  projectPartner: string;
}

interface TeamMember {
  name: string;
  githubUsername: string;
}

interface Team {
  name: string;
  projectPartner: string;
  members: TeamMember[];
}

// Function to read and parse the JSON file
function getTeamsFromJSON(filePath: string): Team[] {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const students: Student[] = JSON.parse(rawData);

  const teamMap: { [key: string]: Team } = {};

  students.forEach((student) => {
    const teamName = student.projectName.replace(/\s+/g, '-'); // Replace spaces with dashes
    if (!teamMap[teamName]) {
      teamMap[teamName] = {
        name: teamName,
        projectPartner: student.projectPartner,
        members: [],
      };
    }

    teamMap[teamName].members.push({
      name: student.name,
      githubUsername: student.githubUsername,
    });
  });

  return Object.values(teamMap);
}

// Function to check if a repository exists
async function reposExist(repoName: string): Promise<boolean> {
  try {
    await octokit.repos.get({
      owner: 'YOUR_GITHUB_ORG',
      repo: repoName,
    });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    } else {
      console.error(`Error checking repository ${repoName}:`, error);
      throw error;
    }
  }
}

// Function to create a new repository
async function createRepos(repoName: string): Promise<void> {
  try {
    await octokit.repos.createInOrg({
      org: 'YOUR_GITHUB_ORG',
      name: repoName,
      private: true,
    });
    console.log(`Repository ${repoName} created successfully.`);
  } catch (error) {
    console.error(`Error creating repository ${repoName}:`, error);
    throw error;
  }
}

// Function to send invites to team members
async function sendInvites(teams: Team[]): Promise<void> {
  for (const team of teams) {
    const repoName = team.name;
    const repoExists = await reposExist(repoName);

    if (!repoExists) {
      await createRepos(repoName);
    }

    for (const member of team.members) {
      const githubUsername = member.githubUsername;

      if (githubUsername) {
        // Check if the member is already a collaborator
        const isCollaborator = await octokit.repos
          .checkCollaborator({
            owner: 'YOUR_GITHUB_ORG',
            repo: repoName,
            username: githubUsername,
          })
          .then(() => true)
          .catch((err) => {
            if (err.status === 404) {
              return false;
            } else {
              console.error(
                `Error checking collaborator ${githubUsername} on repo ${repoName}:`,
                err
              );
              throw err;
            }
          });

        if (!isCollaborator) {
          // Send invite
          try {
            await octokit.repos.addCollaborator({
              owner: 'YOUR_GITHUB_ORG',
              repo: repoName,
              username: githubUsername,
              permission: 'push',
            });
            console.log(
              `Invite sent to ${githubUsername} for repository ${repoName}.`
            );
          } catch (error) {
            console.error(
              `Error inviting ${githubUsername} to repository ${repoName}:`,
              error
            );
            // Handle error notification for invalid GitHub username
          }
        } else {
          console.log(
            `${githubUsername} is already a collaborator on ${repoName}.`
          );
        }
      } else {
        // Handle error notification for invalid GitHub username
        console.error(`Invalid GitHub username for ${member.name}`);
      }
    }
  }
}

// Main function to execute the script
(async () => {
  try {
    const teams = getTeamsFromJSON('test_data.json'); // Ensure this file exists and has valid JSON data
    await sendInvites(teams);
    console.log('Invites have been sent to all team members.');
  } catch (error) {
    console.error('Error sending invites:', error);
  }
})();
