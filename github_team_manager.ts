// Import necessary modules
import { Octokit } from '@octokit/rest';

// Initialize GitHub client
const octokit = new Octokit({ auth: 'YOUR_GITHUB_TOKEN' });

// Interfaces for team and student data
interface TeamMember {
  userId: string;
  name: string;
  githubUsername: string;
}

interface Team {
  name: string;
  members: TeamMember[];
}

interface Project {
  projectId: string;
  name: string;
  partner: string;
}

// Placeholder TeamBuilder class to interact with your data source
class TeamBuilder {
  // Implement these methods according to your data source

  static async getGithubUsername(userId: string): Promise<string | null> {
    // Fetch GitHub username from your data source
    // Replace with actual implementation
    return 'githubUsername';
  }

  static async getStudentInfo(userId: string): Promise<TeamMember | null> {
    // Fetch student info from your data source
    // Replace with actual implementation
    return {
      userId,
      name: 'Student Name',
      githubUsername: 'githubUsername',
    };
  }

  static async getProjectInfo(projectId: string): Promise<Project | null> {
    // Fetch project info from your data source
    // Replace with actual implementation
    return {
      projectId,
      name: 'Project Name',
      partner: 'Project Partner',
    };
  }

  static async getAllTeams(): Promise<Team[]> {
    // Fetch all teams from your data source
    // Replace with actual implementation
    return [
      {
        name: 'Team1',
        members: [
          { userId: '1', name: 'Alice', githubUsername: 'aliceGH' },
          { userId: '2', name: 'Bob', githubUsername: 'bobGH' },
        ],
      },
      // Add more teams as needed
    ];
  }

  static async getPreviousStudents(): Promise<TeamMember[]> {
    // Fetch previous students from your data source
    // Replace with actual implementation
    return [
      { userId: '3', name: 'Charlie', githubUsername: 'charlieGH' },
      // Add more students as needed
    ];
  }
}

// Function to get GitHub username from user ID
async function getGithub(userId: string): Promise<string | null> {
  try {
    const githubUsername = await TeamBuilder.getGithubUsername(userId);
    return githubUsername;
  } catch (error) {
    console.error(`Error fetching GitHub username for user ${userId}:`, error);
    // Implement error notification here
    return null;
  }
}

// Function to get student information
async function getStudent(userId: string): Promise<TeamMember | null> {
  try {
    const studentInfo = await TeamBuilder.getStudentInfo(userId);
    return studentInfo;
  } catch (error) {
    console.error(`Error fetching student info for user ${userId}:`, error);
    return null;
  }
}

// Function to get project information
async function getProject(projectId: string): Promise<Project | null> {
  try {
    const projectInfo = await TeamBuilder.getProjectInfo(projectId);
    return projectInfo;
  } catch (error) {
    console.error(`Error fetching project info for project ${projectId}:`, error);
    return null;
  }
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
async function sendInvites(): Promise<void> {
  const teams = await TeamBuilder.getAllTeams();
  for (const team of teams) {
    const repoName = team.name;
    const repoExists = await reposExist(repoName);

    if (!repoExists) {
      await createRepos(repoName);
    }

    for (const member of team.members) {
      const githubUsername =
        member.githubUsername || (await getGithub(member.userId));
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
        }
      } else {
        // Handle error notification for invalid GitHub username
        console.error(`Invalid GitHub username for user ${member.userId}`);
      }
    }
  }
}

// Function to remove students from previous semesters
async function removeStudent(): Promise<void> {
  const previousStudents = await TeamBuilder.getPreviousStudents();
  for (const student of previousStudents) {
    // Assuming isContinuing is a property indicating if the student is continuing
    if (!(student as any).isContinuing) {
      const githubUsername =
        student.githubUsername || (await getGithub(student.userId));
      if (githubUsername) {
        // Get list of repositories the student is a collaborator on
        const repos = await octokit.repos.listForOrg({
          org: 'YOUR_GITHUB_ORG',
          type: 'all',
          per_page: 100,
        });

        for (const repo of repos.data) {
          // Check if the student is a collaborator
          const isCollaborator = await octokit.repos
            .checkCollaborator({
              owner: 'YOUR_GITHUB_ORG',
              repo: repo.name,
              username: githubUsername,
            })
            .then(() => true)
            .catch((err) => {
              if (err.status === 404) {
                return false;
              } else {
                console.error(
                  `Error checking collaborator ${githubUsername} on repo ${repo.name}:`,
                  err
                );
                throw err;
              }
            });

          if (isCollaborator) {
            // Remove collaborator
            try {
              await octokit.repos.removeCollaborator({
                owner: 'YOUR_GITHUB_ORG',
                repo: repo.name,
                username: githubUsername,
              });
              console.log(
                `Removed ${githubUsername} from repository ${repo.name}.`
              );
            } catch (error) {
              console.error(
                `Error removing ${githubUsername} from repository ${repo.name}:`,
                error
              );
            }
          }
        }
      }
    }
  }
}

// Example usage
(async () => {
  try {
    await sendInvites();
    console.log('Invites have been sent to all team members.');
  } catch (error) {
    console.error('Error sending invites:', error);
  }

  // Uncomment to remove students
  // try {
  //   await removeStudent();
  //   console.log('Previous students have been removed.');
  // } catch (error) {
  //   console.error('Error removing students:', error);
  // }
})();
