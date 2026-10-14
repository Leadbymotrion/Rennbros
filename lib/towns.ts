/**
 * Town pages (/area/<slug>): the main towns of the service area, each with
 * its own short introduction. Only plain facts about where the town is: no
 * invented jobs, streets or reviews. Add real local details (jobs done
 * there, photos) as Renn Bros sends them; that is what makes these pages
 * worth ranking.
 */
import { business } from "@/lib/business";
import { townPoints } from "@/lib/area";

export type TownPage = { slug: string; key: string; en: string; fr: string };

export const townPages: TownPage[] = [
  {
    slug: "pointe-claire",
    key: "Pointe-Claire",
    en: "Pointe-Claire sits on Lac Saint-Louis in the heart of the West Island, between Highways 20 and 40. We come to driveways across the city, from the old village by the lake to the streets north of the 40.",
    fr: "Pointe-Claire borde le lac Saint-Louis, au cœur de l’Ouest-de-l’Île, entre les autoroutes 20 et 40. Nous venons dans les entrées de toute la ville, du vieux village au bord du lac jusqu’aux rues au nord de la 40.",
  },
  {
    slug: "kirkland",
    key: "Kirkland",
    en: "Kirkland runs along Highway 40 in the West Island, next to Beaconsfield, Pointe-Claire and Dollard-des-Ormeaux. A driveway is all we need to change your tires, do an oil change or replace your brakes on site.",
    fr: "Kirkland longe l’autoroute 40 dans l’Ouest-de-l’Île, voisine de Beaconsfield, de Pointe-Claire et de Dollard-des-Ormeaux. Une entrée suffit pour changer vos pneus, faire votre vidange d’huile ou remplacer vos freins sur place.",
  },
  {
    slug: "beaconsfield",
    key: "Beaconsfield",
    en: "Beaconsfield stretches along Lac Saint-Louis between Pointe-Claire and Baie-D'Urfé, with Highway 20 running through it. We work in your driveway or garage, so your car never has to leave home.",
    fr: "Beaconsfield s’étend le long du lac Saint-Louis entre Pointe-Claire et Baie-D’Urfé, traversée par l’autoroute 20. Nous travaillons dans votre entrée ou votre garage : votre voiture n’a pas à quitter la maison.",
  },
  {
    slug: "dollard-des-ormeaux",
    key: "Dollard-des-Ormeaux",
    en: "Dollard-des-Ormeaux sits in the middle of the West Island, north of Highway 40, between Kirkland and Pierrefonds-Roxboro. We come to homes and workplace lots across the city.",
    fr: "Dollard-des-Ormeaux se trouve au milieu de l’Ouest-de-l’Île, au nord de l’autoroute 40, entre Kirkland et Pierrefonds-Roxboro. Nous venons aux maisons et aux stationnements de travail partout dans la ville.",
  },
  {
    slug: "pierrefonds-roxboro",
    key: "Pierrefonds-Roxboro",
    en: "Pierrefonds-Roxboro is the Montréal borough along the Rivière des Prairies, on the north side of the West Island. We serve the whole borough, from Roxboro in the east to the western end of Pierrefonds.",
    fr: "Pierrefonds-Roxboro est l’arrondissement de Montréal qui longe la rivière des Prairies, au nord de l’Ouest-de-l’Île. Nous desservons tout l’arrondissement, de Roxboro à l’est jusqu’à l’extrémité ouest de Pierrefonds.",
  },
  {
    slug: "vaudreuil-dorion",
    key: "Vaudreuil-Dorion",
    en: "Vaudreuil-Dorion is the hub of Vaudreuil-Soulanges, where Highways 20, 30 and 40 meet, just off the island of Montréal. We come to homes and workplaces across the city.",
    fr: "Vaudreuil-Dorion est le carrefour de Vaudreuil-Soulanges, là où se rejoignent les autoroutes 20, 30 et 40, tout près de l’île de Montréal. Nous venons aux maisons et aux lieux de travail partout dans la ville.",
  },
  {
    slug: "l-ile-perrot",
    key: "L'Île-Perrot",
    en: "L'Île-Perrot is on Île Perrot, between Lac Saint-Louis and Lac des Deux-Montagnes, linked to the West Island and Vaudreuil-Dorion by Highway 20. We serve the whole island, Notre-Dame-de-l'Île-Perrot, Pincourt and Terrasse-Vaudreuil included.",
    fr: "L’Île-Perrot se trouve sur l’île Perrot, entre le lac Saint-Louis et le lac des Deux Montagnes, reliée à l’Ouest-de-l’Île et à Vaudreuil-Dorion par l’autoroute 20. Nous desservons toute l’île, y compris Notre-Dame-de-l’Île-Perrot, Pincourt et Terrasse-Vaudreuil.",
  },
  {
    slug: "valleyfield",
    key: "Valleyfield",
    en: "Salaberry-de-Valleyfield, on Lac Saint-François, is the southern end of our service area. Prices are the same as anywhere else we go: travel is included.",
    fr: "Salaberry-de-Valleyfield, au bord du lac Saint-François, est la limite sud de notre territoire. Les prix sont les mêmes que partout ailleurs : le déplacement est inclus.",
  },
];

export const townPage = (slug: string) => townPages.find((p) => p.slug === slug);
export const townPageFor = (key: string) => townPages.find((p) => p.key === key);

/** The served towns closest to this one, nearest first. */
export function nearby(key: string, count = 5): string[] {
  const here = townPoints[key];
  if (!here) return [];
  const km = ([x, y]: [number, number]) => Math.hypot((x - here[0]) * 78.6, (y - here[1]) * 111.2);
  return business.area.towns
    .filter((t) => t !== key && townPoints[t])
    .sort((a, b) => km(townPoints[a]) - km(townPoints[b]))
    .slice(0, count);
}
