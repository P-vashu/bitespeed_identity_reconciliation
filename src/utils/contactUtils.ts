import { PrismaClient } from '@prisma/client'


const prisma = new PrismaClient();

export const handleIdentify = async ({
  email,
  phoneNumber,
}: {
  email?: string;
  phoneNumber?: string;
}) => {
  if (!email && !phoneNumber) {
    throw new Error('At least one of email or phoneNumber must be provided.');
  }

  // Fetch all contacts matching email or phone
  const matchingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email ?? undefined },
        { phoneNumber: phoneNumber ?? undefined },
      ],
    },
  });

  if (matchingContacts.length === 0) {
    // No existing contact — create new primary
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      },
    });

    return {
      primaryContatctId: newContact.id,
      emails: [newContact.email].filter(Boolean),
      phoneNumbers: [newContact.phoneNumber].filter(Boolean),
      secondaryContactIds: [],
    };
  }

  // Contacts exist — identify the primary contact
  const allContactIds = new Set<number>();
  const emails = new Set<string>();
  const phones = new Set<string>();

  // Find all related contacts (multi-level linking)
  const exploreLinkedContacts = async (start: number[]): Promise<any[]> => {
    const visited = new Set<number>();
    const result: any[] = [];

    let toVisit = [...start];

    while (toVisit.length > 0) {
      const batch = await prisma.contact.findMany({
        where: {
          OR: [
            { id: { in: toVisit } },
            { linkedId: { in: toVisit } },
          ],
        },
      });

      const newIds = batch
        .map((c) => [c.id, c.linkedId])
        .flat()
        .filter((id): id is number => !!id && !visited.has(id));

      result.push(...batch);
      newIds.forEach((id) => visited.add(id));
      toVisit = Array.from(new Set(newIds));
    }

    return result;
  };

  const linkedContacts = await exploreLinkedContacts(
    matchingContacts.map((c) => c.id)
  );

  const allContacts = [...linkedContacts, ...matchingContacts];
  const uniqueContacts = Array.from(new Map(allContacts.map(c => [c.id, c])).values());

  // Determine primary (oldest contact)
  const primaryContact = uniqueContacts.reduce((oldest, curr) => {
    return curr.createdAt < oldest.createdAt ? curr : oldest;
  });

  const primaryId = primaryContact.linkPrecedence === 'primary' ? primaryContact.id : primaryContact.linkedId!;

  // Create secondary if new data introduced
  const knownEmails = uniqueContacts.map(c => c.email).filter(Boolean);
  const knownPhones = uniqueContacts.map(c => c.phoneNumber).filter(Boolean);

  const isNewEmail = email && !knownEmails.includes(email);
  const isNewPhone = phoneNumber && !knownPhones.includes(phoneNumber);

  let newSecondary = null;
  if (isNewEmail || isNewPhone) {
    newSecondary = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primaryId,
      },
    });
    uniqueContacts.push(newSecondary);
  }

  // Update any conflicting primaries to secondary
  for (const contact of uniqueContacts) {
    if (contact.id !== primaryId && contact.linkPrecedence === 'primary') {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: 'secondary',
          linkedId: primaryId,
        },
      });
    }
  }

  // Build response
  const finalContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primaryId },
        { linkedId: primaryId },
      ],
    },
  });

  const emailsList = Array.from(new Set(
    finalContacts.map(c => c.email).filter(Boolean)
  ));

  const phonesList = Array.from(new Set(
    finalContacts.map(c => c.phoneNumber).filter(Boolean)
  ));

  const secondaryIds = finalContacts
    .filter(c => c.linkPrecedence === 'secondary')
    .map(c => c.id);

  return {
    primaryContatctId: primaryId,
    emails: emailsList,
    phoneNumbers: phonesList,
    secondaryContactIds: secondaryIds,
  };
};
