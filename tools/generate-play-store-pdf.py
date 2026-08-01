# -*- coding: utf-8 -*-
"""Generate docs/Play-Store-Pas-a-Pas.pdf — manual developer-only steps."""
from pathlib import Path
from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Play-Store-Pas-a-Pas.pdf"


class PDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", size=8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Tortue Survivor - Play Store - {self.page_no()}", align="C")


def main():
    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.set_margins(16, 16, 16)

    def title(text):
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(20, 20, 20)
        pdf.multi_cell(0, 9, text.encode("latin-1", "replace").decode("latin-1"))
        pdf.ln(3)

    def heading(text):
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(183, 28, 28)
        pdf.multi_cell(0, 7, text.encode("latin-1", "replace").decode("latin-1"))
        pdf.ln(2)

    def para(text):
        pdf.set_font("Helvetica", size=10)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(0, 5.5, text.encode("latin-1", "replace").decode("latin-1"))
        pdf.ln(1.5)

    def bullet(text):
        pdf.set_font("Helvetica", size=10)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(0, 5.5, ("- " + text).encode("latin-1", "replace").decode("latin-1"))

    title("Tortue Survivor - Pas a pas Play Store")
    para("Ce PDF liste UNIQUEMENT les actions que vous devez faire vous-meme. Le code, la signature Gradle, les textes et la privacy policy sont deja prepares dans le projet.")
    para("Package Android: com.t12lve.TortueSurvivor")
    para("Fichiers utiles:")
    bullet("docs/play-store/listing-fr.md (textes a coller)")
    bullet("docs/privacy-policy.html (a heberger en HTTPS)")
    bullet("docs/play-store/graphics/icon-512.png")
    bullet("docs/play-store/graphics/feature-graphic-1024x500.png")
    bullet("TortueSurvivor-release.aab (apres npm run android:bundle)")

    heading("Etape 1 - Keystore (une seule fois, critique)")
    para("Sans ce fichier, vous ne pourrez jamais mettre a jour la meme fiche Play Store.")
    bullet("Ouvrir un terminal a la racine du projet melcnsurvivor")
    bullet("Lancer: npm run android:keystore")
    bullet("Choisir un mot de passe store + key (min 6 caracteres), les noter dans un gestionnaire de mots de passe")
    bullet("Fichiers crees (ne PAS committer): android/tortuesurvivor-release.jks et android/keystore.properties")
    bullet("Copier le .jks + mots de passe HORS Dropbox (disque externe / coffre-fort)")

    heading("Etape 2 - Construire l'AAB release")
    bullet("Lancer: npm run android:bundle")
    bullet("Le script synchronise les assets (safe-sync), verifie logo + musique, puis Gradle bundleRelease")
    bullet("Recuperer: TortueSurvivor-release.aab a la racine du projet")
    bullet("Si erreur Missing keystore: refaire l'etape 1")

    heading("Etape 3 - Creer l'application dans Play Console")
    bullet("Aller sur https://play.google.com/console")
    bullet("Creer une appli -> nom affiche: Tortue Survivor")
    bullet("Langue par defaut: Francais")
    bullet("Type: Application / Gratuit")
    bullet("Accepter Play App Signing si propose (recommande)")

    heading("Etape 4 - Fiche store")
    bullet("Ouvrir docs/play-store/listing-fr.md et coller Titre / Description courte / Description complete")
    bullet("Uploader icon-512.png (icone haute resolution)")
    bullet("Uploader feature-graphic-1024x500.png (image d'en-tete)")
    bullet("Ajouter au moins 2 captures telephone portrait (idealement 4-8) depuis votre Pixel")
    bullet("Categorie: Jeux -> Arcade ou Casual")
    bullet("E-mail de contact public: le votre")

    heading("Etape 5 - Politique de confidentialite (URL HTTPS)")
    bullet("Editer docs/privacy-policy.html: remplacer REMPLACER@exemple.com")
    bullet("Heberger le fichier (GitHub Pages, Netlify, votre site) en HTTPS public")
    bullet("Coller l'URL dans Play Console")

    heading("Etape 6 - Questionnaires")
    bullet("Securite des donnees: tableau dans listing-fr.md (par defaut aucune collecte)")
    bullet("Classification contenu (IARC): satire politique, pas kids")
    bullet("Public cible: ne pas cibler les enfants")
    bullet("Publicites: Non")
    bullet("Acces appli: tout jouable sans login")

    heading("Etape 7 - Test interne")
    bullet("Tester -> Tests internes -> Creer une version")
    bullet("Uploader TortueSurvivor-release.aab")
    bullet("Ajouter votre compte Google comme testeur")
    bullet("Verifier sur device: logo, musique, joystick, pause, Retour x2 pour quitter")
    bullet("Si correctif: incrementer versionCode dans android/app/build.gradle, puis re-bundle")

    heading("Etape 8 - Production + review")
    bullet("Quand le test interne est OK: promouvoir / creer une release Production")
    bullet("Notes de version: section 0.1.0 de listing-fr.md")
    bullet("Envoyer pour examen Google (souvent plusieurs jours la 1re fois)")

    heading("Etape 9 - Mises a jour futures")
    bullet("Chaque update: versionCode +1 (obligatoire) et versionName (ex. 0.1.1)")
    bullet("Toujours signer avec LE MEME keystore tortuesurvivor-release.jks")
    bullet("Toujours npm run android:bundle (pas l'APK debug)")
    bullet("Si analytics/pubs un jour: mettre a jour privacy + Data safety")

    heading("Checklist express")
    para("[ ] Keystore sauvegarde hors Dropbox")
    para("[ ] AAB genere et teste en test interne")
    para("[ ] Textes + icon 512 + feature graphic + screenshots")
    para("[ ] Privacy URL HTTPS live")
    para("[ ] Data safety / content rating / ads = Non")
    para("[ ] Production envoyee en review")

    pdf.output(str(OUT))
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
