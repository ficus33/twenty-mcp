import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TwentyClient } from '../client/twenty-client.js';
import { registerOpportunityTools } from './opportunities.js';
import { registerActivityTools } from './activities.js';
import { registerMetadataTools } from './metadata.js';

export function registerPersonTools(server: McpServer, client: TwentyClient) {
  server.registerTool(
    'create_contact',
    {
      title: 'Create Contact',
      description: 'Create a new contact (person) in Twenty CRM with name, email, phone, job title, and optional company association. Returns the created contact ID.',
      inputSchema: {
        firstName: z.string().describe('First name of the contact'),
        lastName: z.string().describe('Last name of the contact'),
        email: z.string().email().optional().describe('Email address'),
        phone: z.string().optional().describe('Phone number'),
        companyId: z.string().optional().describe('ID of associated company'),
        jobTitle: z.string().optional().describe('Job title'),
        linkedinUrl: z.string().url().optional().describe('LinkedIn profile URL'),
        city: z.string().optional().describe('City where the contact is located'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      // Transform flat input to Twenty's nested structure
      const personData = {
        name: {
          firstName: args.firstName,
          lastName: args.lastName,
        },
        ...(args.email && {
          emails: {
            primaryEmail: args.email,
          },
        }),
        ...(args.phone && {
          phones: {
            primaryPhoneNumber: args.phone,
          },
        }),
        ...(args.companyId && { companyId: args.companyId }),
        ...(args.jobTitle && { jobTitle: args.jobTitle }),
        ...(args.linkedinUrl && {
          linkedinLink: {
            primaryLinkUrl: args.linkedinUrl,
          },
        }),
        ...(args.city && { city: args.city }),
      };

      const person = await client.createPerson(personData);
      return {
        content: [{
          type: 'text' as const,
          text: `Contact created successfully: ${person.name.firstName} ${person.name.lastName} (ID: ${person.id})`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error creating contact: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'get_contact',
    {
      title: 'Get Contact',
      description: 'Retrieve a single contact (person) by their unique ID from Twenty CRM. Returns all contact fields including name, email, phone, company, and metadata.',
      inputSchema: {
        id: z.string().describe('Contact ID to retrieve'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const person = await client.getPerson(args.id);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(person, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving contact: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'update_contact',
    {
      title: 'Update Contact',
      description: 'Update an existing contact (person) in Twenty CRM. Only provided fields are updated; omitted fields remain unchanged. Requires the contact ID.',
      inputSchema: {
        id: z.string().describe('Contact ID to update'),
        firstName: z.string().optional().describe('First name'),
        lastName: z.string().optional().describe('Last name'),
        email: z.string().email().optional().describe('Email address'),
        phone: z.string().optional().describe('Phone number'),
        companyId: z.string().optional().describe('ID of associated company'),
        jobTitle: z.string().optional().describe('Job title'),
        linkedinUrl: z.string().url().optional().describe('LinkedIn profile URL'),
        city: z.string().optional().describe('City'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const { id, ...updates } = args;
      const person = await client.updatePerson(id, updates);
      return {
        content: [{
          type: 'text' as const,
          text: `Contact updated successfully: ${person.name.firstName} ${person.name.lastName}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error updating contact: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'search_contacts',
    {
      title: 'Search Contacts',
      description: 'Search for contacts (people) in Twenty CRM by name or email. Supports pagination via limit and offset. Returns matching contact records.',
      inputSchema: {
        query: z.string().describe('Search query (searches name and email)'),
        limit: z.number().optional().default(20).describe('Maximum number of results'),
        offset: z.number().optional().default(0).describe('Number of results to skip'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const people = await client.searchPeople(args.query, {
        limit: args.limit,
        offset: args.offset,
      });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(people, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error searching contacts: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });
}

export function registerCompanyTools(server: McpServer, client: TwentyClient) {
  server.registerTool(
    'create_company',
    {
      title: 'Create Company',
      description: 'Create a new company in Twenty CRM with name, domain, address, and other business details. Revenue is specified in whole currency units and stored internally as micros.',
      inputSchema: {
        name: z.string().describe('Company name'),
        domainName: z.string().optional().describe('Company domain name'),
        address: z.string().optional().describe('Company address'),
        employees: z.number().optional().describe('Number of employees'),
        linkedinUrl: z.string().url().optional().describe('LinkedIn company URL'),
        xUrl: z.string().url().optional().describe('X (Twitter) company URL'),
        annualRecurringRevenue: z.number().optional().describe('Annual recurring revenue'),
        idealCustomerProfile: z.boolean().optional().describe('Is this an ideal customer profile'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      // Transform flat input to Twenty's nested structure
      const companyData = {
        name: args.name,
        ...(args.domainName && {
          domainName: {
            primaryLinkUrl: args.domainName,
          },
        }),
        ...(args.address && {
          address: {
            addressStreet1: args.address,
          },
        }),
        ...(args.employees && { employees: args.employees }),
        ...(args.linkedinUrl && {
          linkedinLink: {
            primaryLinkUrl: args.linkedinUrl,
          },
        }),
        ...(args.xUrl && {
          xLink: {
            primaryLinkUrl: args.xUrl,
          },
        }),
        ...(args.annualRecurringRevenue && {
          annualRecurringRevenue: {
            amountMicros: args.annualRecurringRevenue * 1000000, // Convert to micros
            currencyCode: 'USD',
          },
        }),
        ...(args.idealCustomerProfile !== undefined && { idealCustomerProfile: args.idealCustomerProfile }),
      };

      const company = await client.createCompany(companyData);
      return {
        content: [{
          type: 'text' as const,
          text: `Company created successfully: ${company.name} (ID: ${company.id})`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error creating company: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'get_company',
    {
      title: 'Get Company',
      description: 'Retrieve a single company by its unique ID from Twenty CRM. Returns all company fields including name, domain, address, employees, revenue, and social links.',
      inputSchema: {
        id: z.string().describe('Company ID to retrieve'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const company = await client.getCompany(args.id);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(company, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving company: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'update_company',
    {
      title: 'Update Company',
      description: 'Update an existing company in Twenty CRM. Only provided fields are updated; omitted fields remain unchanged. Requires the company ID.',
      inputSchema: {
        id: z.string().describe('Company ID to update'),
        name: z.string().optional().describe('Company name'),
        domainName: z.string().optional().describe('Company domain name'),
        address: z.string().optional().describe('Company address'),
        employees: z.number().optional().describe('Number of employees'),
        linkedinUrl: z.string().url().optional().describe('LinkedIn company URL'),
        xUrl: z.string().url().optional().describe('X (Twitter) company URL'),
        annualRecurringRevenue: z.number().optional().describe('Annual recurring revenue'),
        idealCustomerProfile: z.boolean().optional().describe('Is this an ideal customer profile'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const { id, ...updateData } = args;

      // Transform flat input to Twenty's nested structure
      const updates = {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.domainName && {
          domainName: {
            primaryLinkUrl: updateData.domainName,
          },
        }),
        ...(updateData.address && {
          address: {
            addressStreet1: updateData.address,
          },
        }),
        ...(updateData.employees && { employees: updateData.employees }),
        ...(updateData.linkedinUrl && {
          linkedinLink: {
            primaryLinkUrl: updateData.linkedinUrl,
          },
        }),
        ...(updateData.xUrl && {
          xLink: {
            primaryLinkUrl: updateData.xUrl,
          },
        }),
        ...(updateData.annualRecurringRevenue && {
          annualRecurringRevenue: {
            amountMicros: updateData.annualRecurringRevenue * 1000000,
            currencyCode: 'USD',
          },
        }),
        ...(updateData.idealCustomerProfile !== undefined && { idealCustomerProfile: updateData.idealCustomerProfile }),
      };

      const company = await client.updateCompany(id, updates);
      return {
        content: [{
          type: 'text' as const,
          text: `Company updated successfully: ${company.name}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error updating company: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'search_companies',
    {
      title: 'Search Companies',
      description: 'Search for companies in Twenty CRM by name or domain. Supports pagination via limit and offset. Returns matching company records.',
      inputSchema: {
        query: z.string().describe('Search query (searches name and domain)'),
        limit: z.number().optional().default(20).describe('Maximum number of results'),
        offset: z.number().optional().default(0).describe('Number of results to skip'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const companies = await client.searchCompanies(args.query, {
        limit: args.limit,
        offset: args.offset,
      });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(companies, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error searching companies: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });
}

export function registerTaskTools(server: McpServer, client: TwentyClient) {
  server.registerTool(
    'create_task',
    {
      title: 'Create Task',
      description: 'Create a new task in Twenty CRM with a title, optional description body, due date (ISO 8601), status (TODO/IN_PROGRESS/DONE), and assignee.',
      inputSchema: {
        title: z.string().describe('Task title'),
        body: z.string().optional().describe('Task description'),
        dueAt: z.string().optional().describe('Due date (ISO 8601 format)'),
        status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().default('TODO').describe('Task status'),
        assigneeId: z.string().optional().describe('ID of the person assigned to the task'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const task = await client.createTask(args);
      return {
        content: [{
          type: 'text' as const,
          text: `Task created successfully: ${task.title} (ID: ${task.id})`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'get_tasks',
    {
      title: 'Get Tasks',
      description: 'Retrieve a paginated list of tasks from Twenty CRM. Use limit and offset for pagination. Returns task details including title, status, due date, and assignee.',
      inputSchema: {
        limit: z.number().optional().default(20).describe('Maximum number of results'),
        offset: z.number().optional().default(0).describe('Number of results to skip'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const tasks = await client.getTasks({
        limit: args.limit,
        offset: args.offset,
      });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(tasks, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  server.registerTool(
    'create_note',
    {
      title: 'Create Note',
      description: 'Create a new note in Twenty CRM with an optional title and a body. Notes are standalone records that can be linked to other entities.',
      inputSchema: {
        title: z.string().optional().describe('Note title'),
        body: z.string().describe('Note content'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
    try {
      const note = await client.createNote(args);
      return {
        content: [{
          type: 'text' as const,
          text: `Note created successfully: ${note.title || 'Untitled'} (ID: ${note.id})`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error creating note: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });
}

export function registerRelationshipTools(server: McpServer, client: TwentyClient) {
  server.registerTool(
    'get_company_contacts',
    {
      title: 'Get Company Contacts',
      description: 'Get all contacts (people) associated with a specific company. Returns a formatted list with names, job titles, emails, and phone numbers.',
      inputSchema: {
        companyId: z.string().describe('The ID of the company to get contacts for'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.getCompanyContacts(args.companyId);

        const contactsList = result.contacts.map(contact =>
          `• ${contact.name.firstName} ${contact.name.lastName}` +
          (contact.jobTitle ? ` - ${contact.jobTitle}` : '') +
          (contact.email ? ` (${contact.email})` : '') +
          (contact.phone ? ` | Phone: ${contact.phone}` : '') +
          `\n  ID: ${contact.id}`
        ).join('\n');

        return {
          content: [{
            type: 'text' as const,
            text: `Company Contacts for "${result.companyName}"\n` +
                  `Company ID: ${result.companyId}\n` +
                  `Total Contacts: ${result.totalContacts}\n\n` +
                  (result.totalContacts > 0 ? `Contacts:\n${contactsList}` : 'No contacts found for this company.')
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error retrieving company contacts: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.registerTool(
    'get_person_opportunities',
    {
      title: 'Get Person Opportunities',
      description: 'Get all opportunities where a specific person is the point of contact. Returns opportunity names, stages, amounts, associated companies, and close dates.',
      inputSchema: {
        personId: z.string().describe('The ID of the person to get opportunities for'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.getPersonOpportunities(args.personId);

        const opportunitiesList = result.opportunities.map(opp => {
          let oppText = `• ${opp.name}`;
          if (opp.stage) oppText += ` (${opp.stage})`;
          if (opp.amount) {
            const amount = opp.amount.amountMicros / 1000000;
            oppText += ` - ${opp.amount.currencyCode} ${amount.toLocaleString()}`;
          }
          if (opp.company) oppText += ` | Company: ${opp.company.name}`;
          if (opp.closeDate) oppText += ` | Close: ${opp.closeDate}`;
          oppText += `\n  ID: ${opp.id}`;
          return oppText;
        }).join('\n');

        return {
          content: [{
            type: 'text' as const,
            text: `Opportunities for "${result.personName}"\n` +
                  `Person ID: ${result.personId}\n` +
                  `Total Opportunities: ${result.totalOpportunities}\n\n` +
                  (result.totalOpportunities > 0 ? `Opportunities:\n${opportunitiesList}` : 'No opportunities found for this person.')
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error retrieving person opportunities: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.registerTool(
    'link_opportunity_to_company',
    {
      title: 'Link Opportunity',
      description: 'Link an opportunity to a company and/or set a point of contact person. At least one of companyId or pointOfContactId must be provided.',
      inputSchema: {
        opportunityId: z.string().describe('The ID of the opportunity to update'),
        companyId: z.string().optional().describe('The ID of the company to link to (optional)'),
        pointOfContactId: z.string().optional().describe('The ID of the person to set as point of contact (optional)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        if (!args.companyId && !args.pointOfContactId) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: At least one of companyId or pointOfContactId must be provided'
            }]
          };
        }

        const result = await client.linkOpportunityToCompany({
          opportunityId: args.opportunityId,
          companyId: args.companyId,
          pointOfContactId: args.pointOfContactId
        });

        let relationshipInfo = '';
        if (result.company) {
          relationshipInfo += `Company: ${result.company.name} (${result.company.id})\n`;
        }
        if (result.pointOfContact) {
          relationshipInfo += `Point of Contact: ${result.pointOfContact.name.firstName} ${result.pointOfContact.name.lastName} (${result.pointOfContact.id})\n`;
        }

        return {
          content: [{
            type: 'text' as const,
            text: `Successfully linked opportunity "${result.name}"\n` +
                  `Opportunity ID: ${result.id}\n\n` +
                  `Updated Relationships:\n${relationshipInfo}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error linking opportunity: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.registerTool(
    'transfer_contact_to_company',
    {
      title: 'Transfer Contact',
      description: 'Transfer a contact (person) from their current company to a different company. Optionally provide the current company ID for validation.',
      inputSchema: {
        contactId: z.string().describe('The ID of the contact to transfer'),
        toCompanyId: z.string().describe('The ID of the company to transfer the contact to'),
        fromCompanyId: z.string().optional().describe('The ID of the current company (optional, for validation)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.transferContactToCompany({
          contactId: args.contactId,
          fromCompanyId: args.fromCompanyId,
          toCompanyId: args.toCompanyId
        });

        return {
          content: [{
            type: 'text' as const,
            text: `Successfully transferred contact "${result.name.firstName} ${result.name.lastName}"\n` +
                  `Contact ID: ${result.id}\n` +
                  `New Company: ${result.company?.name || 'Unknown'} (${result.companyId})`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error transferring contact: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.registerTool(
    'get_relationship_summary',
    {
      title: 'Get Relationship Summary',
      description: 'Get a count summary of all relationships for a company or person, including connected companies, contacts, opportunities, tasks, and activities.',
      inputSchema: {
        entityId: z.string().describe('The ID of the entity to get relationship summary for'),
        entityType: z.enum(['company', 'person']).describe('The type of entity (company or person)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.getRelationshipSummary(args.entityId, args.entityType);

        return {
          content: [{
            type: 'text' as const,
            text: `Relationship Summary for ${args.entityType}: ${args.entityId}\n\n` +
                  `Connected Relationships:\n` +
                  `• Companies: ${result.relationships.companies}\n` +
                  `• Contacts: ${result.relationships.contacts}\n` +
                  `• Opportunities: ${result.relationships.opportunities}\n` +
                  `• Tasks: ${result.relationships.tasks}\n` +
                  `• Activities: ${result.relationships.activities}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error getting relationship summary: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.registerTool(
    'find_orphaned_records',
    {
      title: 'Find Orphaned Records',
      description: 'Scan the CRM for records missing important relationships: companies without contacts, contacts without companies, opportunities with missing links, and unassigned tasks.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.findOrphanedRecords();

        let report = 'Orphaned Records Report\n====================\n\n';

        // Companies without contacts
        if (result.companies.length > 0) {
          report += `Companies without contacts (${result.companies.length}):\n`;
          result.companies.forEach(company => {
            report += `• ${company.name} (${company.opportunityCount} opportunities)\n  ID: ${company.id}\n`;
          });
          report += '\n';
        }

        // Contacts without companies
        if (result.contacts.length > 0) {
          report += `Contacts without companies (${result.contacts.length}):\n`;
          result.contacts.forEach(contact => {
            report += `• ${contact.name} (${contact.opportunityCount} opportunities)\n  ID: ${contact.id}\n`;
          });
          report += '\n';
        }

        // Summary
        report += `Summary:\n`;
        report += `• ${result.companies.length} companies without contacts\n`;
        report += `• ${result.contacts.length} contacts without companies\n`;
        report += `• ${result.opportunities.length} opportunities with missing relationships\n`;
        report += `• ${result.tasks.length} tasks without assignees`;

        if (result.companies.length === 0 && result.contacts.length === 0 &&
            result.opportunities.length === 0 && result.tasks.length === 0) {
          report += '\n\n✅ No orphaned records found! All records have proper relationships.';
        }

        return {
          content: [{
            type: 'text' as const,
            text: report
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error finding orphaned records: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export { registerOpportunityTools, registerActivityTools, registerMetadataTools };
