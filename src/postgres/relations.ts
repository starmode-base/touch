import { relations } from "drizzle-orm/relations";
import {
  users,
  opportunities,
  opportunityActivities,
  passkeys,
  contacts,
  contactRoles,
  contactActivities,
  opportunityContactLinks,
  contactRoleAssignments,
} from "./schema";

export const opportunitiesRelations = relations(
  opportunities,
  ({ one, many }) => ({
    user: one(users, {
      fields: [opportunities.user_id],
      references: [users.id],
    }),
    opportunityActivities: many(opportunityActivities),
    opportunityContactLinks: many(opportunityContactLinks),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  opportunities: many(opportunities),
  opportunityActivities: many(opportunityActivities),
  passkeys: many(passkeys),
  contacts: many(contacts),
  contactRoles: many(contactRoles),
  contactActivities: many(contactActivities),
  opportunityContactLinks: many(opportunityContactLinks),
  contactRoleAssignments: many(contactRoleAssignments),
}));

export const opportunityActivitiesRelations = relations(
  opportunityActivities,
  ({ one }) => ({
    user: one(users, {
      fields: [opportunityActivities.user_id],
      references: [users.id],
    }),
    opportunity: one(opportunities, {
      fields: [opportunityActivities.user_id],
      references: [opportunities.id],
    }),
  }),
);

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.user_id],
    references: [users.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, {
    fields: [contacts.user_id],
    references: [users.id],
  }),
  contactActivities: many(contactActivities),
  opportunityContactLinks: many(opportunityContactLinks),
  contactRoleAssignments: many(contactRoleAssignments),
}));

export const contactRolesRelations = relations(
  contactRoles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [contactRoles.user_id],
      references: [users.id],
    }),
    contactRoleAssignments: many(contactRoleAssignments),
  }),
);

export const contactActivitiesRelations = relations(
  contactActivities,
  ({ one }) => ({
    user: one(users, {
      fields: [contactActivities.user_id],
      references: [users.id],
    }),
    contact: one(contacts, {
      fields: [contactActivities.user_id],
      references: [contacts.id],
    }),
  }),
);

export const opportunityContactLinksRelations = relations(
  opportunityContactLinks,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [opportunityContactLinks.user_id],
      references: [contacts.id],
    }),
    opportunity: one(opportunities, {
      fields: [opportunityContactLinks.user_id],
      references: [opportunities.id],
    }),
    user: one(users, {
      fields: [opportunityContactLinks.user_id],
      references: [users.id],
    }),
  }),
);

export const contactRoleAssignmentsRelations = relations(
  contactRoleAssignments,
  ({ one }) => ({
    user: one(users, {
      fields: [contactRoleAssignments.user_id],
      references: [users.id],
    }),
    contact: one(contacts, {
      fields: [contactRoleAssignments.user_id],
      references: [contacts.id],
    }),
    contactRole: one(contactRoles, {
      fields: [contactRoleAssignments.user_id],
      references: [contactRoles.id],
    }),
  }),
);
