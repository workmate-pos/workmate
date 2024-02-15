/* @name getNextSequenceValue */
SELECT NEXTVAL(FORMAT('%I', :sequenceName! :: TEXT)) :: INTEGER AS "id!";
